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

test("an operator activates a scenario", async () => {
  const token = await tokenFor("operator-test", "operator-test-pw");
  const res = await activate("DEMO-002", token);
  const activation = await res.json();
  assert.equal(res.status, 201);
  assert.equal(activation.scenarioId, "DEMO-002");
  assert.equal(activation.status, "ACTIVE");
  assert.equal(activation.actor, "operator-test");
  assert.deepEqual(validate(activation, "scenario-state.schema.json"), []);
});

test("activating B on the same track as A leaves A active", async () => {
  // DEMO-001 (A-B, active from the seed) and DEMO-003 (B-C) are both on
  // track 1. A stood down by B would no longer be listed as active.
  // Only this test activates DEMO-003 first, so its own 201 is checked.
  const token = await tokenFor("operator-test", "operator-test-pw");
  const res = await activate("DEMO-003", token);
  assert.equal(res.status, 201);
  const active = await activeScenarioIds(token);
  assert.ok(active.includes("DEMO-001"));
  assert.ok(active.includes("DEMO-003"));
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

  const active = await listActivations(token, "?status=ACTIVE");
  assert.equal(active.status, 200);
  const list = (await active.json()) as {
    scenarioId: string;
    status: string;
  }[];
  assert.ok(list.some((a) => a.scenarioId === "DEMO-001"));
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
  const token = await tokenFor("operator-test", "operator-test-pw");
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
