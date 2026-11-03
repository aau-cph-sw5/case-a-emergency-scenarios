import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  seedTestScenarios,
} from "./helpers.js";

const sql = getDatabase();
// The application may not delete position reports, so cleanup runs as the owner.
const owner = getOwnerDatabase();
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

before(async () => {
  const users = await seedTestUsers("deployment-");
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
  const activated = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-002/activate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${operatorToken}` },
    },
  );
  assert.equal(activated.status, 201);
  await owner`DELETE FROM position_reports WHERE staff = ${stewardId}`;
});

after(async () => {
  await owner`DELETE FROM position_reports WHERE staff = ${stewardId}`;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
  await closeOwnerDatabase();
});

async function report(extra: { arrived?: boolean; taskDone?: boolean }) {
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stewardToken}`,
    },
    body: JSON.stringify({
      staff: "",
      station: "Station G",
      reportedAt: "2026-11-03T08:00:00Z",
      ...extra,
    }),
  });
  assert.equal(response.status, 202);
}

async function deploymentAtG() {
  const response = await fetch(`${baseUrl}/api/v1/activations?status=ACTIVE`, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  const [activation] = (await response.json()) as {
    deployments: { status: string; staff: string | null; fulfills: string }[];
  }[];
  return activation.deployments.find((d) => d.fulfills === "Station G");
}

test("the steward's deployment follows on the way, arrived and task done", async () => {
  assert.equal((await deploymentAtG())?.status, "UNMANNED");

  await report({});
  assert.equal((await deploymentAtG())?.status, "PENDING");
  assert.equal((await deploymentAtG())?.staff, stewardId);

  await report({ arrived: true });
  assert.equal((await deploymentAtG())?.status, "MANNED");

  await report({ taskDone: true });
  assert.equal((await deploymentAtG())?.status, "TASK_DONE");
});

test("the event records whether the steward arrived", async () => {
  const events = await sql<{ payload: { arrived: boolean } }[]>`
    SELECT payload FROM incident_events
    WHERE type = 'POSITION_REPORTED' AND actor_id = ${stewardId}
      AND payload->>'arrived' = 'true'
  `;
  assert.equal(events.length, 1);
});
