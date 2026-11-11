import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { seedTestScenarios } from "./helpers.js";

// Standing down and switching scenarios
let server: Server;
let baseUrl: string;
let operatorToken: string;
let operatorId: number;
let activationId: number;

const OPERATOR_USERNAME = "switch-operator";
const STEWARD_USERNAME = "switch-steward";

before(async () => {
  const users = await seedTestUsers("switch-");
  operatorId = users.find((user) => user.role === "OPERATOR")!.id;
  await seedTestScenarios();

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  operatorToken = await tokenFor(OPERATOR_USERNAME, "operator123", "web");
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
});

async function tokenFor(
  username: string,
  password: string,
  client: "web" | "mobile",
) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

function activate(scenarioId: string, token?: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${baseUrl}/api/v1/scenarios/${scenarioId}/activate`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function standDown(id: string | number, token?: string) {
  return fetch(`${baseUrl}/api/v1/activations/${id}/stand-down`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function postReport(token: string, body: object) {
  return fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function activations(status: "ACTIVE" | "CLOSED") {
  const response = await fetch(
    `${baseUrl}/api/v1/activations?status=${status}`,
    { headers: { Authorization: `Bearer ${operatorToken}` } },
  );
  return (await response.json()) as {
    activationId: number;
    scenarioId: string;
    endedAt: string | null;
  }[];
}

type LoggedEvent = {
  type: string;
  actorId: string;
  actorRole: string;
  serverTime: Date;
  sequence: string;
  payload: { scenarioId: string };
};

function eventsFor(id: number) {
  return getDatabase()<LoggedEvent[]>`
    SELECT type, actor_id, actor_role, server_time, sequence, payload
    FROM incident_events
    WHERE activation_id = ${String(id)}
    ORDER BY sequence
  `;
}

test("stand-down without a token is refused", async () => {
  const res = await standDown("ACT-DEMO-001-1");
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, ERROR_CODES.AUTH_TOKEN_INVALID);
});

test("an operator activates the scenario the next tests work on", async () => {
  const res = await activate("DEMO-001", operatorToken);
  assert.equal(res.status, 201);
  activationId = (await res.json()).activationId;
});

test("a steward may not stand down a scenario", async () => {
  const res = await standDown(
    activationId,
    await tokenFor(STEWARD_USERNAME, "steward123", "mobile"),
  );
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, ERROR_CODES.ROLE_NOT_PERMITTED);
  assert.deepEqual(
    (await activations("ACTIVE")).map((a) => a.activationId),
    [activationId],
  );
});

test("an unknown activation cannot be stood down", async () => {
  const res = await standDown("ACT-NOPE-1", operatorToken);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, ERROR_CODES.NOT_FOUND);
});

test("activating without replaces while a scenario is active is still refused", async () => {
  const res = await activate("DEMO-003", operatorToken);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, ERROR_CODES.CONFLICT);
});

test("a switch that replaces another activation than the active one changes nothing", async () => {
  const before = await eventsFor(activationId);

  const res = await activate("DEMO-003", operatorToken, {
    replaces: 2147483647,
  });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, ERROR_CODES.CONFLICT);

  assert.deepEqual(
    (await activations("ACTIVE")).map((a) => a.activationId),
    [activationId],
  );
  assert.equal((await eventsFor(activationId)).length, before.length);
});

test("a body that does not match the contract is refused", async () => {
  const res = await activate("DEMO-003", operatorToken, { replaces: "42" });
  assert.equal(res.status, 400);
  assert.deepEqual(
    (await activations("ACTIVE")).map((a) => a.activationId),
    [activationId],
  );
});

test("a switch stands down the active scenario and activates the new one, logging both", async () => {
  const outgoing = activationId;

  const res = await activate("DEMO-003", operatorToken, { replaces: outgoing });
  assert.equal(res.status, 201);
  const incoming = await res.json();
  assert.deepEqual(validate(incoming, "scenario-state.schema.json"), []);
  assert.equal(incoming.scenarioId, "DEMO-003");
  assert.equal(incoming.status, "ACTIVE");

  // Only the new scenario is active; the old one is closed with an end time.
  assert.deepEqual(
    (await activations("ACTIVE")).map((a) => a.activationId),
    [incoming.activationId],
  );
  const closed = (await activations("CLOSED")).find(
    (a) => a.activationId === outgoing,
  );
  assert.ok(closed);
  assert.equal(typeof closed.endedAt, "string");

  // Both transitions are logged with the actor and the time
  // the stand-down right before the activation.
  const [stoodDown] = (await eventsFor(outgoing)).filter(
    (e) => e.type === "SCENARIO_STOOD_DOWN",
  );
  const [activated] = await eventsFor(incoming.activationId);
  assert.ok(stoodDown);
  assert.equal(activated.type, "SCENARIO_ACTIVATED");
  for (const event of [stoodDown, activated]) {
    assert.equal(event.actorId, String(operatorId));
    assert.equal(event.actorRole, "OPERATOR");
    assert.ok(event.serverTime instanceof Date);
  }
  assert.equal(stoodDown.payload.scenarioId, "DEMO-001");
  assert.equal(activated.payload.scenarioId, "DEMO-003");
  assert.ok(BigInt(stoodDown.sequence) < BigInt(activated.sequence));
  assert.equal(incoming.sequence, Number(activated.sequence));

  activationId = incoming.activationId;
});

test("a report queued against a replaced scenario is refused as superseded", async () => {
  const stewardToken = await tokenFor(STEWARD_USERNAME, "steward123", "mobile");
  const replaced = (await activations("CLOSED")).find(
    (a) => a.scenarioId === "DEMO-001",
  );
  assert.ok(replaced);

  const stale = await postReport(stewardToken, {
    id: randomUUID(),
    activationId: replaced.activationId,
    staff: "",
    station: "Station B",
    reportedAt: "2026-11-05T12:00:00Z",
    event: "EN_ROUTE",
  });
  assert.equal(stale.status, 409);
  assert.equal(
    ((await stale.json()) as { error: { code: string } }).error.code,
    ERROR_CODES.SCENARIO_STOOD_DOWN,
  );

  // A report against the scenario that replaced it is still accepted.
  const current = await postReport(stewardToken, {
    id: randomUUID(),
    activationId,
    staff: "",
    station: "Station G",
    reportedAt: "2026-11-05T12:01:00Z",
    event: "EN_ROUTE",
  });
  assert.equal(current.status, 202);
});

test("an operator stands down the active scenario and it is logged", async () => {
  const res = await standDown(activationId, operatorToken);
  assert.equal(res.status, 200);
  const closed = await res.json();
  assert.deepEqual(validate(closed, "scenario-state.schema.json"), []);
  assert.equal(closed.activationId, activationId);
  assert.equal(closed.status, "CLOSED");
  assert.equal(typeof closed.endedAt, "string");

  // No scenario is active any more
  assert.deepEqual(await activations("ACTIVE"), []);
  const state = await fetch(`${baseUrl}/api/v1/scenario-state`, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  assert.equal(await state.json(), null);

  const stoodDown = (await eventsFor(activationId)).filter(
    (e) => e.type === "SCENARIO_STOOD_DOWN",
  );
  assert.equal(stoodDown.length, 1);
  assert.equal(stoodDown[0].actorId, String(operatorId));
  assert.ok(stoodDown[0].serverTime instanceof Date);
});

test("standing down twice is refused without a second event", async () => {
  const res = await standDown(activationId, operatorToken);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, ERROR_CODES.SCENARIO_STOOD_DOWN);
  assert.equal(
    (await eventsFor(activationId)).filter(
      (e) => e.type === "SCENARIO_STOOD_DOWN",
    ).length,
    1,
  );
});

test("after a stand-down a scenario can be activated again without replaces", async () => {
  const res = await activate("DEMO-003", operatorToken);
  assert.equal(res.status, 201);
});
