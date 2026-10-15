import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { validate } from "../../src/validation/contract-validator.js";

let server: Server;
let baseUrl: string;

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

function postJson(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loginAs(username: string, password: string) {
  const response = await postJson("/api/v1/auth/login", { username, password });
  return (await response.json()) as { token: string; role: string };
}

test("POST /api/v1/auth/login returns a token and role", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: "operator-test",
    password: "operator-test-pw",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(validate(body, "login-response.schema.json"), []);
  assert.equal(body.role, "OPERATOR");
});

test("POST /api/v1/auth/login rejects a wrong password with 401", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: "operator-test",
    password: "wrong",
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0102");
});

test("POST /api/v1/auth/login rejects an invalid body with 400", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: "operator-test",
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, "E0006");
});

test("GET /api/v1/me returns the signed-in user", async () => {
  const { token } = await loginAs("steward-test", "steward-test-pw");
  const response = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(validate(body, "me.schema.json"), []);
  assert.deepEqual(body, { userId: "steward-test", role: "STEWARD" });
});

test("GET /api/v1/me rejects a missing or invalid token with 401", async () => {
  const missing = await fetch(`${baseUrl}/api/v1/me`);
  const invalid = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: "Bearer not-a-real-token" },
  });

  assert.equal(missing.status, 401);
  assert.equal(invalid.status, 401);
  assert.equal((await invalid.json()).error.code, "E0001");
});

test("GET /api/v1/scenarios returns the scenario list", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scenarios`);

  assert.equal(response.status, 200);
  assert.deepEqual(
    validate(await response.json(), "scenario-list.schema.json"),
    [],
  );
});

test("GET /api/v1/scenarios/:scenarioId returns one scenario", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scenarios/DEMO-001`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(validate(body, "scenario.schema.json"), []);
  assert.equal(body.scenarioId, "DEMO-001");
});

test("GET /api/v1/scenarios/:scenarioId returns 404 for an unknown id", async () => {
  const unknown = await fetch(`${baseUrl}/api/v1/scenarios/wrongId`);
  const traversal = await fetch(
    `${baseUrl}/api/v1/scenarios/..%2Ftest-accounts`,
  );

  assert.equal(unknown.status, 404);
  assert.equal(traversal.status, 404);
});

test("GET /api/v1/scenario-state returns the current state", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scenario-state`);

  assert.equal(response.status, 200);
  assert.deepEqual(
    validate(await response.json(), "scenario-state.schema.json"),
    [],
  );
});

test("GET /api/v1/metro-lines/:lineId returns the line or 404", async () => {
  const found = await fetch(`${baseUrl}/api/v1/metro-lines/M1`);
  const unknown = await fetch(`${baseUrl}/api/v1/metro-lines/M1000`);

  assert.equal(found.status, 200);
  assert.deepEqual(validate(await found.json(), "metro-line.schema.json"), []);
  assert.equal(unknown.status, 404);
});

test("POST /api/v1/position-reports accepts a valid report with 202", async () => {
  const response = await postJson("/api/v1/position-reports", {
    staff: "steward-002",
    station: "Station B",
    reportedAt: "2026-09-23T08:10:00Z",
  });

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { accepted: true });
});

test("POST /api/v1/position-reports rejects an invalid body with 400", async () => {
  const response = await postJson("/api/v1/position-reports", {
    staff: "steward-002",
    reportedAt: "not date",
  });

  assert.equal(response.status, 400);
});
