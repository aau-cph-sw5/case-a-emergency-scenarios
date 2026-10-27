import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";

// The same rules as activate-scenario.test.mjs, against the real app.
let server: Server;
let baseUrl: string;

const OPERATOR_USERNAME = "activation-operator";
const STEWARD_USERNAME = "activation-steward";

before(async () => {
  await seedTestUsers("activation-");

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
});

async function tokenFor(
  username: string,
  password: string,
  expectedRole: "STEWARD" | "OPERATOR",
) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, expectedRole }),
  });
  return ((await response.json()) as { token: string }).token;
}

function activate(scenarioId: string, token?: string) {
  return fetch(`${baseUrl}/api/v1/scenarios/${scenarioId}/activate`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function listActivations(token?: string, query = "") {
  return fetch(`${baseUrl}/api/v1/activations${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function activeScenarioIds(token: string) {
  const list = (await (
    await listActivations(token, "?status=ACTIVE")
  ).json()) as {
    scenarioId: string;
  }[];
  return list.map((a) => a.scenarioId);
}

function eventsBy(username: string) {
  return getDatabase()<{ activationId: string; serverTime: Date }[]>`
    SELECT e.activation_id, e.server_time FROM incident_events e
    JOIN users u ON e.actor_id = u.id::text
    WHERE e.type = 'SCENARIO_ACTIVATED' AND u.username = ${username}
  `;
}

test("without a token the activation is refused", async () => {
  const res = await activate("DEMO-002");
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, ERROR_CODES.AUTH_TOKEN_INVALID);
});

test("a steward may not activate a scenario", async () => {
  const res = await activate(
    "DEMO-002",
    await tokenFor(STEWARD_USERNAME, "steward123", "STEWARD"),
  );
  assert.equal(res.status, 403);
  assert.equal((await eventsBy(STEWARD_USERNAME)).length, 0);
  assert.equal((await res.json()).error.code, ERROR_CODES.ROLE_NOT_PERMITTED);
});

test("an operator activates a scenario", async () => {
  const token = await tokenFor(OPERATOR_USERNAME, "operator123", "OPERATOR");
  const before = (await eventsBy(OPERATOR_USERNAME)).length;
  const res = await activate("DEMO-002", token);
  const activation = await res.json();
  assert.equal(res.status, 201);
  const events = await eventsBy(OPERATOR_USERNAME);
  assert.equal(events.length, before + 1);
  assert.equal(events.at(-1)!.activationId, activation.activationId);
  assert.ok(events.at(-1)!.serverTime instanceof Date);
  assert.equal(activation.scenarioId, "DEMO-002");
  assert.equal(activation.status, "ACTIVE");
  assert.equal(activation.actor, OPERATOR_USERNAME);
  assert.deepEqual(validate(activation, "scenario-state.schema.json"), []);
});

test("the current scenario state is the active activation", async () => {
  const token = await tokenFor(OPERATOR_USERNAME, "operator123", "OPERATOR");
  const res = await fetch(`${baseUrl}/api/v1/scenario-state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  const state = await res.json();
  assert.deepEqual(validate(state, "scenario-state.schema.json"), []);
  const active = (await (
    await listActivations(token, "?status=ACTIVE")
  ).json()) as unknown[];
  assert.deepEqual(active, [state]);
});

test("activating a scenario while another is active is refused", async () => {
  const token = await tokenFor(OPERATOR_USERNAME, "operator123", "OPERATOR");
  const before = (await eventsBy(OPERATOR_USERNAME)).length;
  for (const scenarioId of ["DEMO-002", "DEMO-003"]) {
    const res = await activate(scenarioId, token);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error.code, ERROR_CODES.CONFLICT);
  }
  assert.deepEqual(await activeScenarioIds(token), ["DEMO-002"]);
  assert.equal((await eventsBy(OPERATOR_USERNAME)).length, before);
});

test("an unknown scenario is refused", async () => {
  const token = await tokenFor(OPERATOR_USERNAME, "operator123", "OPERATOR");
  const before = (await eventsBy(OPERATOR_USERNAME)).length;
  const res = await activate("NOPE", token);
  assert.equal(res.status, 404);
  assert.equal((await eventsBy(OPERATOR_USERNAME)).length, before);
  assert.equal((await res.json()).error.code, ERROR_CODES.NOT_FOUND);
});

test("the activations list returns the active scenarios, filtered by status", async () => {
  const token = await tokenFor(OPERATOR_USERNAME, "operator123", "OPERATOR");

  const active = await listActivations(token, "?status=ACTIVE");
  assert.equal(active.status, 200);
  const list = (await active.json()) as {
    scenarioId: string;
    status: string;
  }[];
  assert.ok(list.some((a) => a.scenarioId === "DEMO-002"));
  assert.ok(list.every((a) => a.status === "ACTIVE"));
  for (const activation of list) {
    assert.deepEqual(validate(activation, "scenario-state.schema.json"), []);
  }

  const all = (await (await listActivations(token)).json()) as unknown[];
  assert.equal(all.length, list.length);

  const closed = await listActivations(token, "?status=CLOSED");
  assert.equal(closed.status, 200);
  assert.deepEqual(await closed.json(), []);
});

test("the activations list needs a token", async () => {
  assert.equal((await listActivations()).status, 401);
});

test("an unknown or repeated status filter is refused", async () => {
  const token = await tokenFor(OPERATOR_USERNAME, "operator123", "OPERATOR");
  for (const query of [
    "?status=active",
    "?status=NOPE",
    "?status=ACTIVE&status=CLOSED",
  ]) {
    const res = await listActivations(token, query);
    assert.equal(res.status, 400, query);
    assert.equal((await res.json()).error.code, ERROR_CODES.INVALID_REQUEST);
  }
});
