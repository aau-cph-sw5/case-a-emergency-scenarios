import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { validate } from "../../src/validation/contract-validator.js";

// The same rules as activate-scenario.test.mjs, against the real app.
let server: Server;
let baseUrl: string;

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function tokenFor(username: string, password: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return ((await response.json()) as { token: string }).token;
}

function activate(scenarioId: string, token?: string) {
  return fetch(`${baseUrl}/api/v1/scenarios/${scenarioId}/activate`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

test("without a token the activation is refused", async () => {
  const res = await activate("DEMO-002");
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error.code, ERROR_CODES.AUTH_TOKEN_INVALID);
});

test("a steward may not activate a scenario", async () => {
  const res = await activate(
    "DEMO-002",
    await tokenFor("steward-test", "steward-test-pw"),
  );
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error.code, ERROR_CODES.ROLE_NOT_PERMITTED);
});

test("an operator activates scenarios, also on the same line", async () => {
  const token = await tokenFor("operator-test", "operator-test-pw");
  for (const scenarioId of ["DEMO-002", "DEMO-003"]) {
    const res = await activate(scenarioId, token);
    const activation = await res.json();
    assert.equal(res.status, 201);
    assert.equal(activation.scenarioId, scenarioId);
    assert.equal(activation.status, "ACTIVE");
    assert.equal(activation.actor, "operator-test");
    assert.deepEqual(validate(activation, "scenario-state.schema.json"), []);
  }
});

test("activating B on the same line as A leaves A active", async () => {
  // DEMO-002 and DEMO-003 are both on track 1. A stood down by B would no
  // longer be active, so activating A again would not be refused.
  const token = await tokenFor("operator-test", "operator-test-pw");
  assert.equal((await activate("DEMO-002", token)).status, 409);
  assert.equal((await activate("DEMO-003", token)).status, 409);
});

test("activating the same scenario twice is refused", async () => {
  const token = await tokenFor("operator-test", "operator-test-pw");
  const res = await activate("DEMO-001", token);
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, ERROR_CODES.CONFLICT);
});

test("an unknown scenario is refused", async () => {
  const token = await tokenFor("operator-test", "operator-test-pw");
  const res = await activate("NOPE", token);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error.code, ERROR_CODES.NOT_FOUND);
});

test("the activations list returns the active scenarios, filtered by status", async () => {
  const token = await tokenFor("operator-test", "operator-test-pw");
  const headers = { Authorization: `Bearer ${token}` };
  await activate("DEMO-003", token);

  const active = await fetch(`${baseUrl}/api/v1/activations?status=ACTIVE`, {
    headers,
  });
  assert.equal(active.status, 200);
  const list = (await active.json()) as {
    scenarioId: string;
    status: string;
  }[];
  assert.ok(list.some((a) => a.scenarioId === "DEMO-003"));
  assert.ok(list.every((a) => a.status === "ACTIVE"));

  const closed = await fetch(`${baseUrl}/api/v1/activations?status=CLOSED`, {
    headers,
  });
  assert.deepEqual(await closed.json(), []);

  assert.equal((await fetch(`${baseUrl}/api/v1/activations`)).status, 401);
});
