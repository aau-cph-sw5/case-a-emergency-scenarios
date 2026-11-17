import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";

// Tests for ensuring that the analyst can log in on their web app
// but can not do scenario state changing actions.
let server: Server;
let baseUrl: string;

before(async () => {
  await seedTestUsers("analyst-role-");
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
});

async function loginAsAnalyst() {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "analyst-role-analyst",
      password: "analyst123",
      client: "web",
    }),
  });
  assert.equal(response.status, 200);
  return response.json();
}

test("an analyst can log in on the web app", async () => {
  const body = await loginAsAnalyst();
  assert.deepEqual(validate(body, "login-response.schema.json"), []);
  assert.equal(body.role, "ANALYST");
});

test("an analyst can not activate a scenario", async () => {
  const { token } = await loginAsAnalyst();
  const response = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-001/activate`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(response.status, 403);
});

test("an analyst can not stand down a scenario", async () => {
  const { token } = await loginAsAnalyst();
  const response = await fetch(`${baseUrl}/api/v1/activations/1/stand-down`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 403);
});

test("an analyst can not report a position", async () => {
  const { token } = await loginAsAnalyst();
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      activationId: 1,
      staff: "some-steward",
      station: "some-station",
      reportedAt: "2026-01-01T11:11:11Z",
    }),
  });
  assert.equal(response.status, 403);
});
