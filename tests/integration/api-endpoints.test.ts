import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";

let server: Server;
let baseUrl: string;
let operatorId: number;
let stewardId: number;

const OPERATOR_USERNAME = "api-operator-test";
const STEWARD_USERNAME = "api-steward-test";

before(async () => {
  const users = await seedTestUsers("api-");
  operatorId = users.find((user) => user.username === OPERATOR_USERNAME)!.id;
  stewardId = users.find((user) => user.username === STEWARD_USERNAME)!.id;

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
});

function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function bearer(username: string, password: string) {
  const { token } = await loginAs(username, password);
  return { Authorization: `Bearer ${token}` };
}

function operatorHeaders() {
  return bearer(OPERATOR_USERNAME, "operator-test-pw");
}

function stewardHeaders() {
  return bearer(STEWARD_USERNAME, "steward-test-pw");
}

async function loginAs(username: string, password: string) {
  const response = await postJson("/api/v1/auth/login", { username, password });
  return (await response.json()) as { token: string; role: string };
}

test("POST /api/v1/auth/login returns a token and role", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME,
    password: "operator-test-pw",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(validate(body, "login-response.schema.json"), []);
  assert.equal(body.role, "OPERATOR");

  const payload = jwt.decode(body.token);
  assert.ok(payload && typeof payload !== "string");
  assert.equal(payload.userId, operatorId);
  assert.equal(payload.role, "OPERATOR");
  assert.equal(typeof payload.jti, "string");
  assert.equal(payload.exp! - payload.iat!, 30 * 24 * 60 * 60);
});

test("POST /api/v1/auth/login matches usernames without regard to casing", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME.toUpperCase(),
    password: "operator-test-pw",
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).role, "OPERATOR");
});

test("POST /api/v1/auth/login rejects a wrong password with 401", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME,
    password: "wrong",
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0102");
});

test("POST /api/v1/auth/login rejects an unknown username with 401", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: "not-a-user",
    password: "not-a-password",
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
  const response = await fetch(`${baseUrl}/api/v1/me`, {
    headers: await stewardHeaders(),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(validate(body, "me.schema.json"), []);
  assert.deepEqual(body, { userId: stewardId, role: "STEWARD" });
});

test("POST /api/v1/auth/logout revokes the current session", async () => {
  const headers = await stewardHeaders();
  const logout = await postJson("/api/v1/auth/logout", {}, headers);
  const me = await fetch(`${baseUrl}/api/v1/me`, { headers });

  assert.equal(logout.status, 204);
  assert.equal(me.status, 401);
});

test("a second login replaces the first session for an account", async () => {
  const first = await bearer(OPERATOR_USERNAME, "operator-test-pw");
  const second = await bearer(OPERATOR_USERNAME, "operator-test-pw");
  const firstMe = await fetch(`${baseUrl}/api/v1/me`, { headers: first });
  const secondMe = await fetch(`${baseUrl}/api/v1/me`, { headers: second });

  assert.equal(firstMe.status, 401);
  assert.equal(secondMe.status, 200);
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
  const response = await fetch(`${baseUrl}/api/v1/scenarios`, {
    headers: await operatorHeaders(),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    validate(await response.json(), "scenario-list.schema.json"),
    [],
  );
});

test("GET /api/v1/scenarios/:scenarioId returns one scenario", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scenarios/DEMO-001`, {
    headers: await operatorHeaders(),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(validate(body, "scenario.schema.json"), []);
  assert.equal(body.scenarioId, "DEMO-001");
});

test("GET /api/v1/scenarios/:scenarioId returns 404 for an unknown id", async () => {
  const headers = await operatorHeaders();
  const unknown = await fetch(`${baseUrl}/api/v1/scenarios/wrongId`, {
    headers,
  });
  const traversal = await fetch(
    `${baseUrl}/api/v1/scenarios/..%2Ftest-accounts`,
    { headers },
  );

  assert.equal(unknown.status, 404);
  assert.equal(traversal.status, 404);
});

test("GET /api/v1/scenario-state returns the current state", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scenario-state`, {
    headers: await operatorHeaders(),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(
    validate(await response.json(), "scenario-state.schema.json"),
    [],
  );
});

test("GET /api/v1/metro-lines/:lineId returns the line or 404", async () => {
  const headers = await operatorHeaders();
  const found = await fetch(`${baseUrl}/api/v1/metro-lines/M1`, { headers });
  const unknown = await fetch(`${baseUrl}/api/v1/metro-lines/M1000`, {
    headers,
  });

  assert.equal(found.status, 200);
  assert.deepEqual(validate(await found.json(), "metro-line.schema.json"), []);
  assert.equal(unknown.status, 404);
});

// Station G is only in DEMO-002
const stationGReport = {
  staff: "",
  station: "Station G",
  reportedAt: "2026-09-23T08:10:00Z",
};

test("POST /api/v1/position-reports rejects an invalid body with 400", async () => {
  const response = await postJson(
    "/api/v1/position-reports",
    {
      staff: "steward-002",
      reportedAt: "not date",
    },
    await stewardHeaders(),
  );

  assert.equal(response.status, 400);
});

test("POST /api/v1/position-reports refuses an operator with E0002", async () => {
  const response = await postJson(
    "/api/v1/position-reports",
    stationGReport,
    await operatorHeaders(),
  );

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "E0002");
});

// One test, so the refusal always runs before DEMO-002 is activated.
test("POST /api/v1/position-reports refuses Station G with E1004 until DEMO-002 is activated, then accepts it with 202", async () => {
  const before = await postJson(
    "/api/v1/position-reports",
    stationGReport,
    await stewardHeaders(),
  );
  assert.equal(before.status, 409);
  assert.equal((await before.json()).error.code, "E1004");

  const activation = await postJson(
    "/api/v1/scenarios/DEMO-002/activate",
    {},
    await operatorHeaders(),
  );
  assert.equal(activation.status, 201);

  const after = await postJson(
    "/api/v1/position-reports",
    stationGReport,
    await stewardHeaders(),
  );
  assert.equal(after.status, 202);
  assert.deepEqual(await after.json(), { accepted: true });
});

test("protected endpoints reject requests without a token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scenarios`);

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0001");
});
