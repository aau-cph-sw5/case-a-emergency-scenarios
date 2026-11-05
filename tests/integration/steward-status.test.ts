import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { listActivations } from "../../src/repositories/fixture-repository.js";
import { changeStewardStatus } from "../../src/services/steward-status-service.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { closeOwnerDatabase, seedTestScenarios } from "./helpers.js";

// MET-A-015: assign, check in, check out, against the real server and
// database, with no position report.
const sql = getDatabase();
let server: Server;
let baseUrl: string;
let stewardId: string;
let stewardToken: string;
let operatorToken: string;

async function login(username: string, password: string, client: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return ((await response.json()) as { token: string }).token;
}

async function post(path: string, token: string, body?: object) {
  const response = await fetch(`${baseUrl}/api/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const assign = (station: string) =>
  post("steward-status/assign", stewardToken, { station });
const checkIn = () => post("steward-status/check-in", stewardToken);
const checkOut = () => post("steward-status/check-out", stewardToken);

function own(state: {
  deployments: { staff?: string | null; status: string }[];
}) {
  return state.deployments.find((d) => d.staff === stewardId);
}

function statusEvents() {
  return sql<{ payload: Record<string, string>; serverTime: Date }[]>`
    SELECT payload, server_time FROM incident_events
    WHERE type = 'STEWARD_STATUS_CHANGED' AND actor_id = ${stewardId}
    ORDER BY sequence
  `;
}

before(async () => {
  const users = await seedTestUsers("stewardstatus-");
  await seedTestScenarios();
  const steward = users.find((user) => user.role === "STEWARD")!;
  const operator = users.find((user) => user.role === "OPERATOR")!;
  stewardId = String(steward.id);

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  stewardToken = await login(steward.username, "steward123", "mobile");
  operatorToken = await login(operator.username, "operator123", "web");
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
  await closeOwnerDatabase();
});

test("assign without an active scenario is refused with E1001", async () => {
  const res = await assign("Station A");
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "E1001");
});

test("an operator may not change a steward status", async () => {
  const res = await post("steward-status/check-in", operatorToken);
  assert.equal(res.status, 403);
});

test("check in without assign is refused with E1006", async () => {
  const activated = await post("scenarios/DEMO-001/activate", operatorToken);
  assert.equal(activated.status, 201);
  // Every fixture scenario has one station, so a second one is added to the
  // in-memory activation for "assign to a new station".
  listActivations("ACTIVE")[0].deployments.push({
    status: "UNMANNED",
    staff: null,
    fulfills: "Station Extra",
  });

  const res = await checkIn();
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "E1006");
});

test("check out without check in is refused with E1006", async () => {
  const res = await checkOut();
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "E1006");
});

test("assign to a station outside the scenario is refused with E1004", async () => {
  const res = await assign("No Such Station");
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "E1004");
});

test("assign, check in, check out, then assign to a new station", async () => {
  const [first, second] = listActivations("ACTIVE")[0].deployments.map(
    (d) => d.fulfills,
  );

  const assigned = await assign(first);
  assert.equal(assigned.status, 200);
  assert.equal(own(assigned.body)?.status, "PENDING");
  assert.ok(own(assigned.body)?.reportedAt);

  const enRoute = await checkOut();
  assert.equal(enRoute.status, 409, "check out is on site only");
  assert.equal(enRoute.body.error.code, "E1006");

  const again = await assign(second);
  assert.equal(again.status, 409, "assign before check out");
  assert.equal(again.body.error.code, "E1006");

  const checkedIn = await checkIn();
  assert.equal(checkedIn.status, 200);
  assert.equal(own(checkedIn.body)?.status, "MANNED");
  assert.ok(own(checkedIn.body)?.arrivedAt);

  const checkedOut = await checkOut();
  assert.equal(checkedOut.status, 200);
  assert.equal(own(checkedOut.body), undefined, "no status after check out");
  const cleared = checkedOut.body.deployments.find(
    (d: { fulfills: string }) => d.fulfills === first,
  );
  assert.deepEqual(
    [cleared.status, cleared.staff, cleared.reportedAt, cleared.arrivedAt],
    ["UNMANNED", null, null, null],
  );

  const reassigned = await assign(second);
  assert.equal(reassigned.status, 200);
  assert.equal(own(reassigned.body)?.fulfills, second);

  // GET /scenario-state shows the same, so a client refetch agrees.
  const state = await fetch(`${baseUrl}/api/v1/scenario-state`, {
    headers: { Authorization: `Bearer ${stewardToken}` },
  }).then((r) => r.json());
  assert.equal(own(state)?.status, "PENDING");

  const events = await statusEvents();
  assert.deepEqual(
    events.map((e) => [
      e.payload.stationId,
      e.payload.fromStatus,
      e.payload.toStatus,
    ]),
    [
      [first, "UNMANNED", "PENDING"],
      [first, "PENDING", "MANNED"],
      [first, "MANNED", "UNMANNED"],
      [second, "UNMANNED", "PENDING"],
    ],
  );
  assert.ok(events.every((e) => e.serverTime instanceof Date));
});

test("a failed event write takes the status change back", async () => {
  const steward: AuthUser = {
    userId: Number(stewardId),
    role: "STEWARD",
    jti: "test",
  };
  const failingWrite = () => Promise.reject(new Error("event write failed"));
  await assert.rejects(
    changeStewardStatus(steward, "check-in", undefined, failingWrite),
  );
  const deployment = listActivations("ACTIVE")[0].deployments.find(
    (d) => d.staff === stewardId,
  );
  assert.equal(deployment?.status, "PENDING");
});
