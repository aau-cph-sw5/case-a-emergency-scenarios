import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  seedTestScenarios,
  seededUser,
} from "./helpers.js";

// Each line group has its own active scenario.

const owner = getOwnerDatabase();
let server: Server;
let baseUrl: string;
const tokens = {
  m1m2Operator: "",
  m3m4Operator: "",
  m1m2Steward: "",
  m3m4Steward: "",
};
let stewardIds: string[];

async function login(username: string, password: string, client: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

before(async () => {
  const users = await seedTestUsers("lines-");
  await seedTestScenarios();
  stewardIds = users
    .filter((user) => user.role === "STEWARD")
    .map((user) => String(user.id));

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const as = (role: "OPERATOR" | "STEWARD", lineGroup: "M1_M2" | "M3_M4") => {
    const user = seededUser(users, role, lineGroup);
    return role === "OPERATOR"
      ? login(user.username, "operator123", "web")
      : login(user.username, "steward123", "mobile");
  };
  tokens.m1m2Operator = await as("OPERATOR", "M1_M2");
  tokens.m3m4Operator = await as("OPERATOR", "M3_M4");
  tokens.m1m2Steward = await as("STEWARD", "M1_M2");
  tokens.m3m4Steward = await as("STEWARD", "M3_M4");
});

after(async () => {
  for (const id of stewardIds) {
    await owner`DELETE FROM position_reports WHERE staff = ${id}`;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
  await closeOwnerDatabase();
});

function post(path: string, token: string, body: unknown = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

function activate(token: string, scenarioId: string, replaces?: number) {
  return post(
    `/api/v1/scenarios/${scenarioId}/activate`,
    token,
    replaces === undefined ? {} : { replaces },
  );
}

async function active(token: string) {
  const response = await fetch(`${baseUrl}/api/v1/activations?status=ACTIVE`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as {
    activationId: number;
    scenarioId: string;
    lineGroup: string;
  }[];
}

async function scenarioState(token: string) {
  const response = await fetch(`${baseUrl}/api/v1/scenario-state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return (await response.json()) as { scenarioId: string } | null;
}

function report(token: string, station: string) {
  return post("/api/v1/position-reports", token, {
    staff: "",
    station,
    reportedAt: new Date().toISOString(),
  });
}

test("both line groups can have an active scenario at the same time", async () => {
  assert.equal((await activate(tokens.m1m2Operator, "DEMO-001")).status, 201);
  assert.equal((await activate(tokens.m3m4Operator, "DEMO-002")).status, 201);

  // Each operator only sees their own line group's activation.
  assert.deepEqual(
    (await active(tokens.m1m2Operator)).map((a) => [a.scenarioId, a.lineGroup]),
    [["DEMO-001", "M1_M2"]],
  );
  assert.deepEqual(
    (await active(tokens.m3m4Operator)).map((a) => [a.scenarioId, a.lineGroup]),
    [["DEMO-002", "M3_M4"]],
  );
  assert.equal(
    (await scenarioState(tokens.m1m2Steward))?.scenarioId,
    "DEMO-001",
  );
  assert.equal(
    (await scenarioState(tokens.m3m4Steward))?.scenarioId,
    "DEMO-002",
  );
});

test("a second activation in the same line group is still refused", async () => {
  const response = await activate(tokens.m1m2Operator, "DEMO-003");

  assert.equal(response.status, 409);
  assert.equal((await response.json()).error.code, ERROR_CODES.CONFLICT);
});

test("an operator cannot activate, switch to or stand down the other line group's scenario", async () => {
  const [m3m4Activation] = await active(tokens.m3m4Operator);
  const [m1m2Activation] = await active(tokens.m1m2Operator);

  const activated = await activate(tokens.m1m2Operator, "DEMO-002");
  const switched = await activate(
    tokens.m1m2Operator,
    "DEMO-002",
    m1m2Activation.activationId,
  );
  const stoodDown = await post(
    `/api/v1/activations/${m3m4Activation.activationId}/stand-down`,
    tokens.m1m2Operator,
  );

  for (const response of [activated, switched, stoodDown]) {
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, ERROR_CODES.NOT_FOUND);
  }
  assert.deepEqual(
    (await active(tokens.m3m4Operator)).map((a) => a.activationId),
    [m3m4Activation.activationId],
  );
  assert.deepEqual(
    (await active(tokens.m1m2Operator)).map((a) => a.activationId),
    [m1m2Activation.activationId],
  );
});

test("a position report only matches its own line group's activation", async () => {
  const own = await report(tokens.m3m4Steward, "Station G");
  const other = await report(tokens.m1m2Steward, "Station G");

  assert.equal(own.status, 202);
  assert.equal(other.status, 409);
  assert.equal(
    (await other.json()).error.code,
    ERROR_CODES.STATION_NOT_IN_SCENARIO,
  );
});

test("a steward whose line group has nothing active cannot report", async () => {
  const [m1m2Activation] = await active(tokens.m1m2Operator);
  const stoodDown = await post(
    `/api/v1/activations/${m1m2Activation.activationId}/stand-down`,
    tokens.m1m2Operator,
  );
  assert.equal(stoodDown.status, 200);

  // M3/M4 is still active, but that does not count for an M1/M2 steward.
  const response = await report(tokens.m1m2Steward, "Station G");
  assert.equal(response.status, 409);
  assert.equal(
    (await response.json()).error.code,
    ERROR_CODES.NO_ACTIVE_SCENARIO,
  );
  assert.equal((await active(tokens.m3m4Operator)).length, 1);
});
