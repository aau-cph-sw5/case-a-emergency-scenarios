import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { attachSocketHandlers } from "../../src/realtime/socket-server.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import { appendEvent } from "../../src/services/incident-log-service.js";
import {
  saveStewardStatus,
  type ActiveActivation,
} from "../../src/services/steward-status-service.js";
import { validate } from "../../src/validation/contract-validator.js";
import type { StewardStatus } from "../../shared/types/v1/steward-status.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { closeOwnerDatabase, seedTestScenarios } from "./helpers.js";

const sql = getDatabase();
let server: HttpServer;
let baseUrl: string;
let steward: AuthUser;
let stewardToken: string;
let operatorToken: string;
const sockets: Socket[] = [];

before(async () => {
  const users = await seedTestUsers("status-");
  await seedTestScenarios();
  const stewardAccount = users.find((user) => user.role === "STEWARD")!;
  const operatorAccount = users.find((user) => user.role === "OPERATOR")!;
  steward = { userId: stewardAccount.id, role: "STEWARD", jti: "test-only" };

  server = createServer(app);
  const io = new Server(server);
  app.locals.io = io;
  attachSocketHandlers(io);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  stewardToken = await login(stewardAccount.username, "steward123", "mobile");
  operatorToken = await login(operatorAccount.username, "operator123", "web");
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  const io = app.locals.io as Server;
  delete app.locals.io;
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
  await closeOwnerDatabase();
});

async function login(
  username: string,
  password: string,
  client: "web" | "mobile",
) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return ((await response.json()) as { token: string }).token;
}

async function call(
  method: string,
  path: string,
  token: string,
  body?: unknown,
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: await response.json() };
}

const setStatus = (status: string, station = "Station B") =>
  call("PUT", "/api/v1/steward-status", stewardToken, { status, station });

type LoggedEvent = { type: string; actorId: string; payload: unknown };

function statusEvents(activationId: string) {
  return sql<LoggedEvent[]>`
    SELECT type, actor_id, payload FROM incident_events
    WHERE type = 'STEWARD_STATUS_CHANGED'
      AND activation_id = ${activationId}
      AND subject_id = ${String(steward.userId)}
    ORDER BY sequence
  `;
}

// The activation the HTTP tests run in, set once DEMO-001 is activated.
let activationId: string;

test("without an active scenario every call answers E1001", async () => {
  for (const [method, path, token] of [
    ["GET", "/api/v1/steward-status", stewardToken],
    ["PUT", "/api/v1/steward-status", stewardToken],
    ["GET", "/api/v1/steward-statuses", operatorToken],
  ]) {
    const body =
      method === "PUT" ? { status: "ASSIGNED", station: "Station B" } : {};
    const res = await call(
      method,
      path,
      token,
      method === "PUT" ? body : undefined,
    );
    assert.equal(res.status, 409, `${method} ${path}`);
    assert.equal(res.json.error.code, "E1001");
  }

  const activated = await call(
    "POST",
    "/api/v1/scenarios/DEMO-001/activate",
    operatorToken,
    {},
  );
  assert.equal(activated.status, 201);
  activationId = activated.json.activationId;
});

test("a new activation starts with no status", async () => {
  const res = await call("GET", "/api/v1/steward-status", stewardToken);
  assert.equal(res.status, 200);
  assert.equal(res.json, null);
});

test("only a steward sets a status, and only an operator reads them all", async () => {
  const operatorSets = await call(
    "PUT",
    "/api/v1/steward-status",
    operatorToken,
    { status: "ASSIGNED", station: "Station B" },
  );
  assert.equal(operatorSets.status, 403);
  assert.equal(operatorSets.json.error.code, "E0002");

  const stewardLists = await call(
    "GET",
    "/api/v1/steward-statuses",
    stewardToken,
  );
  assert.equal(stewardLists.status, 403);
  assert.equal(stewardLists.json.error.code, "E0002");
});

test("an invalid body or a station outside the scenario is refused", async () => {
  const invalid = await call("PUT", "/api/v1/steward-status", stewardToken, {
    status: "EN_ROUTE",
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.json.error.code, "E0006");

  const outside = await setStatus("ASSIGNED", "Station Z");
  assert.equal(outside.status, 409);
  assert.equal(outside.json.error.code, "E1004");
});

test("checking in before assigning is refused with E1006 and changes nothing", async () => {
  const res = await setStatus("CHECKED_IN");
  assert.equal(res.status, 409);
  assert.equal(res.json.error.code, "E1006");
  assert.equal(res.json.error.message, "Assign yourself to a station first");

  const own = await call("GET", "/api/v1/steward-status", stewardToken);
  assert.equal(own.json, null);
  assert.equal((await statusEvents(activationId)).length, 0);
});

test("assign, check in and check out are stored, logged and pushed to operators", async () => {
  const operatorSocket = connect(baseUrl, {
    auth: { token: operatorToken },
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(operatorSocket);
  await new Promise((resolve) => operatorSocket.once("welcome", resolve));
  const pushed: StewardStatus[] = [];
  operatorSocket.on("steward-status-changed", (status: StewardStatus) =>
    pushed.push(status),
  );

  for (const status of ["ASSIGNED", "CHECKED_IN", "CHECKED_OUT"]) {
    const res = await setStatus(status);
    assert.equal(res.status, 200);
    assert.deepEqual(validate(res.json, "steward-status.schema.json"), []);
    assert.equal(res.json.status, status);
    assert.equal(res.json.userId, steward.userId);
    assert.equal(res.json.activationId, activationId);
  }

  const events = await statusEvents(activationId);
  assert.deepEqual(
    events.map((event) => event.payload),
    [
      {
        stationId: "Station B",
        fromStatus: null,
        fromStationId: null,
        toStatus: "ASSIGNED",
      },
      {
        stationId: "Station B",
        fromStatus: "ASSIGNED",
        fromStationId: "Station B",
        toStatus: "CHECKED_IN",
      },
      {
        stationId: "Station B",
        fromStatus: "CHECKED_IN",
        fromStationId: "Station B",
        toStatus: "CHECKED_OUT",
      },
    ],
  );
  assert.ok(events.every((e) => e.actorId === String(steward.userId)));

  // The pushes go out after each commit; give the last one time to arrive.
  for (let i = 0; i < 20 && pushed.length < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.deepEqual(
    pushed.map((status) => status.status),
    ["ASSIGNED", "CHECKED_IN", "CHECKED_OUT"],
  );
});

test("a repeat answers the current status and writes no event", async () => {
  const before = await call("GET", "/api/v1/steward-status", stewardToken);
  const res = await setStatus("CHECKED_OUT");
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, before.json);
  assert.equal((await statusEvents(activationId)).length, 3);
});

test("a change the contract does not allow is refused and changes nothing", async () => {
  const res = await setStatus("CHECKED_IN");
  assert.equal(res.status, 409);
  assert.equal(res.json.error.code, "E1006");

  const own = await call("GET", "/api/v1/steward-status", stewardToken);
  assert.equal(own.json.status, "CHECKED_OUT");
  assert.equal((await statusEvents(activationId)).length, 3);
});

test("an operator reads every status in the active scenario", async () => {
  const res = await call("GET", "/api/v1/steward-statuses", operatorToken);
  assert.equal(res.status, 200);
  assert.deepEqual(validate(res.json, "steward-status-list.schema.json"), []);
  const mine = res.json.find(
    (status: StewardStatus) => status.userId === steward.userId,
  );
  assert.equal(mine.status, "CHECKED_OUT");
});

// The service tests run in activations of their own, so they cannot meet the
// HTTP tests' rows or each other's.
function anActivation(): ActiveActivation {
  return {
    activationId: `ACT-TEST-${randomUUID()}`,
    sequence: 1_000_000_000 + Math.floor(Math.random() * 1_000_000_000),
  };
}

async function statusIn(active: ActiveActivation) {
  const rows = await sql<{ status: string }[]>`
    SELECT status FROM steward_statuses
    WHERE activation_sequence = ${active.sequence}
  `;
  return rows.map((row) => row.status);
}

class Rollback extends Error {}

test("a failing event write rolls back the change", async () => {
  const active = anActivation();
  // The database rejects this type name, so the event write really fails.
  const writeInvalidEvent: typeof appendEvent = (db, user, event) =>
    appendEvent(db, user, { ...event, type: "not a valid type" });

  await assert.rejects(
    sql.begin((tx) =>
      saveStewardStatus(
        tx,
        steward,
        active,
        { status: "ASSIGNED", station: "Station B" },
        writeInvalidEvent,
      ),
    ),
    (error: unknown) => (error as { code?: string }).code === "23514",
  );

  assert.deepEqual(await statusIn(active), []);
});

test("rolling back the change writes no event", async () => {
  const active = anActivation();

  await assert.rejects(
    sql.begin(async (tx) => {
      const outcome = await saveStewardStatus(tx, steward, active, {
        status: "ASSIGNED",
        station: "Station B",
      });
      assert.equal(outcome.result, "CHANGED");
      throw new Rollback();
    }),
    Rollback,
  );

  assert.deepEqual(await statusIn(active), []);
  assert.equal((await statusEvents(active.activationId)).length, 0);
});

// The first request holds its transaction open until the second has read the
// same status, so the two really overlap.
async function race(
  active: ActiveActivation,
  first: { status: "ASSIGNED" | "CHECKED_IN"; station: string },
  second: { status: "ASSIGNED" | "CHECKED_IN"; station: string },
) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let written!: () => void;
  const firstWritten = new Promise<void>((resolve) => (written = resolve));

  const firstDone = sql.begin(async (tx) => {
    const outcome = await saveStewardStatus(tx, steward, active, first);
    written();
    await held;
    return outcome;
  });
  await firstWritten;
  const secondDone = sql.begin((tx) =>
    saveStewardStatus(tx, steward, active, second),
  );
  // Long enough for the second to read and then wait on the first's row.
  await new Promise((resolve) => setTimeout(resolve, 200));
  release();
  return Promise.all([firstDone, secondDone]);
}

test("two first assigns at the same time give one change and one event", async () => {
  const active = anActivation();
  const [first, second] = await race(
    active,
    { status: "ASSIGNED", station: "Station B" },
    { status: "ASSIGNED", station: "Station C" },
  );

  assert.equal(first.result, "CHANGED");
  assert.equal(second.result, "INVALID");
  assert.deepEqual(await statusIn(active), ["ASSIGNED"]);
  assert.equal((await statusEvents(active.activationId)).length, 1);
});

test("two check-ins at the same time give one change and one event", async () => {
  const active = anActivation();
  await sql.begin((tx) =>
    saveStewardStatus(tx, steward, active, {
      status: "ASSIGNED",
      station: "Station B",
    }),
  );

  const [first, second] = await race(
    active,
    { status: "CHECKED_IN", station: "Station B" },
    { status: "CHECKED_IN", station: "Station B" },
  );

  assert.equal(first.result, "CHANGED");
  assert.equal(second.result, "INVALID");
  assert.deepEqual(await statusIn(active), ["CHECKED_IN"]);
  assert.equal((await statusEvents(active.activationId)).length, 2);
});
