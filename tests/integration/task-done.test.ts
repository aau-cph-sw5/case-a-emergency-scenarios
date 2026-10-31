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

async function login(username: string, password: string, client: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return ((await response.json()) as { token: string }).token;
}

before(async () => {
  const users = await seedTestUsers("taskdone-");
  await seedTestScenarios();
  const steward = users.find((user) => user.role === "STEWARD")!;
  const operator = users.find((user) => user.role === "OPERATOR")!;
  stewardId = String(steward.id);

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  stewardToken = await login(steward.username, "steward123", "mobile");
  const operatorToken = await login(operator.username, "operator123", "web");
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

async function report(taskDone?: boolean) {
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stewardToken}`,
    },
    body: JSON.stringify({
      staff: "",
      station: "Station G",
      reportedAt: "2026-10-31T08:00:00Z",
      ...(taskDone === undefined ? {} : { taskDone }),
    }),
  });
  return { status: response.status, body: await response.json() };
}

function taskDoneEvents() {
  return sql<{ payload: { taskDone?: boolean } }[]>`
    SELECT payload FROM incident_events
    WHERE type = 'POSITION_REPORTED' AND actor_id = ${stewardId}
      AND payload->>'taskDone' = 'true'
  `;
}

test("task done before reporting at the station is refused with E1006", async () => {
  const res = await report(true);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "E1006");
});

test("task done after reporting at the station is stored and logged", async () => {
  assert.equal((await report()).status, 202);
  assert.equal((await report(true)).status, 202);

  const [latest] = await sql<{ taskDone: boolean }[]>`
    SELECT task_done FROM position_reports
    WHERE staff = ${stewardId} ORDER BY received_at DESC LIMIT 1
  `;
  assert.equal(latest.taskDone, true);
  assert.equal((await taskDoneEvents()).length, 1);
});

test("sending task done again is a harmless repeat", async () => {
  const res = await report(true);
  assert.equal(res.status, 202);
  assert.equal((await taskDoneEvents()).length, 1);
});
