import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { app } from "../../src/app.js";
import { postRenew } from "../../src/controllers/auth-controller.js";
import { getDatabase } from "../../src/db/client.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";

let server: Server;
let baseUrl: string;
let operatorId: number;
let stewardId: number;

const OPERATOR_USERNAME = "api-operator";
const STEWARD_USERNAME = "api-steward";

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
  const expectedRole = username === OPERATOR_USERNAME ? "OPERATOR" : "STEWARD";
  const { token } = await loginAs(username, password, expectedRole);
  return { Authorization: `Bearer ${token}` };
}

function operatorHeaders() {
  return bearer(OPERATOR_USERNAME, "operator123");
}

function stewardHeaders() {
  return bearer(STEWARD_USERNAME, "steward123");
}

async function loginAs(
  username: string,
  password: string,
  expectedRole: "STEWARD" | "OPERATOR",
) {
  const response = await postJson("/api/v1/auth/login", {
    username,
    password,
    expectedRole,
  });
  return (await response.json()) as {
    token: string;
    role: string;
    expiresAt: string;
  };
}

test("POST /api/v1/auth/login returns a token and role", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME,
    password: "operator123",
    expectedRole: "OPERATOR",
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
    password: "operator123",
    expectedRole: "OPERATOR",
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).role, "OPERATOR");
});

test("POST /api/v1/auth/login rejects a wrong password with 401", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME,
    password: "wrong",
    expectedRole: "OPERATOR",
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0102");
});

test("POST /api/v1/auth/login rejects an account for the wrong client role", async () => {
  const originalLogin = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME,
    password: "operator123",
    expectedRole: "OPERATOR",
  });
  const originalToken = ((await originalLogin.json()) as { token: string })
    .token;

  const response = await postJson("/api/v1/auth/login", {
    username: OPERATOR_USERNAME,
    password: "operator123",
    expectedRole: "STEWARD",
  });

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0102");

  const stillValid = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${originalToken}` },
  });
  assert.equal(stillValid.status, 200);
});

test("POST /api/v1/auth/login rejects an unknown username with 401", async () => {
  const response = await postJson("/api/v1/auth/login", {
    username: "not-a-user",
    password: "not-a-password",
    expectedRole: "OPERATOR",
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

test("POST /api/v1/auth/renew replaces a session that is due", async () => {
  const first = await loginAs(OPERATOR_USERNAME, "operator123", "OPERATOR");
  const firstPayload = jwt.decode(first.token);

  assert.ok(firstPayload && typeof firstPayload !== "string");

  const sql = getDatabase();
  await sql`
    UPDATE auth_sessions
    SET expires_at = NOW() + INTERVAL '1 day'
    WHERE user_id = ${operatorId}
  `;

  const response = await postJson(
    "/api/v1/auth/renew",
    {},
    {
      Authorization: `Bearer ${first.token}`,
    },
  );
  const renewed = (await response.json()) as { token: string };
  const renewedPayload = jwt.decode(renewed.token);

  assert.equal(response.status, 200);
  assert.deepEqual(validate(renewed, "login-response.schema.json"), []);
  assert.ok(renewedPayload && typeof renewedPayload !== "string");
  assert.notEqual(renewedPayload.jti, firstPayload.jti);

  const oldSession = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${first.token}` },
  });
  const newSession = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${renewed.token}` },
  });

  assert.equal(oldSession.status, 401);
  assert.equal(newSession.status, 200);
});

test("POST /api/v1/auth/renew allows only one concurrent replacement", async () => {
  const session = await loginAs(OPERATOR_USERNAME, "operator123", "OPERATOR");
  const sql = getDatabase();
  await sql`
    UPDATE auth_sessions
    SET expires_at = NOW() + INTERVAL '1 day'
    WHERE user_id = ${operatorId}
  `;

  const responses = await Promise.all([
    postJson(
      "/api/v1/auth/renew",
      {},
      {
        Authorization: `Bearer ${session.token}`,
      },
    ),
    postJson(
      "/api/v1/auth/renew",
      {},
      {
        Authorization: `Bearer ${session.token}`,
      },
    ),
  ]);

  const successful = responses.filter((response) => response.status === 200);
  const rejected = responses.filter((response) => response.status === 401);

  assert.equal(successful.length, 1);
  assert.equal(rejected.length, 1);

  const replacement = (await successful[0].json()) as { token: string };
  const oldSession = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  const newSession = await fetch(`${baseUrl}/api/v1/me`, {
    headers: { Authorization: `Bearer ${replacement.token}` },
  });

  assert.equal(oldSession.status, 401);
  assert.equal(newSession.status, 200);
});

test("POST /api/v1/auth/renew does not replace a session that is not due", async () => {
  const session = await loginAs(OPERATOR_USERNAME, "operator123", "OPERATOR");

  const response = await postJson(
    "/api/v1/auth/renew",
    {},
    {
      Authorization: `Bearer ${session.token}`,
    },
  );

  assert.equal(response.status, 204);
});

test("POST /api/v1/auth/renew rejects a missing token", async () => {
  const response = await postJson("/api/v1/auth/renew", {});

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0001");
});

test("postRenew rejects a session replaced after authentication", async () => {
  let statusCode: number | undefined;
  let body: unknown;
  const response = {
    locals: {
      user: {
        userId: operatorId,
        role: "OPERATOR" as const,
        jti: randomUUID(),
      },
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };

  await postRenew({} as Request, response as unknown as Response);

  assert.equal(statusCode, 401);
  assert.deepEqual(body, {
    error: {
      code: "E0001",
      message: "Invalid or expired token",
    },
  });
});

test("a second login replaces the first session for an account", async () => {
  const first = await bearer(OPERATOR_USERNAME, "operator123");
  const second = await bearer(OPERATOR_USERNAME, "operator123");
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
