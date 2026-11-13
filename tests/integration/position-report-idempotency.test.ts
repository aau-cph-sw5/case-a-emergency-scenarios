import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { seedTestScenarios } from "./helpers.js";

const sql = getDatabase();

let server: Server;
let baseUrl: string;
let operatorToken: string;
let stewardToken: string;

async function login(
  username: string,
  password: string,
  client: "web" | "mobile",
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });

  assert.equal(response.status, 200);

  return ((await response.json()) as { token: string }).token;
}

function postReport(body: object) {
  return fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stewardToken}`,
    },
    body: JSON.stringify(body),
  });
}

before(async () => {
  const users = await seedTestUsers("idempotency-");
  await seedTestScenarios();

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const operator = users.find((user) => user.role === "OPERATOR")!;
  const steward = users.find((user) => user.role === "STEWARD")!;

  operatorToken = await login(operator.username, "operator123", "web");

  stewardToken = await login(steward.username, "steward123", "mobile");
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
});

test("offline report retries are idempotent", async () => {
  // Activate a scenario that includes Station C.
  const activation = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-003/activate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${operatorToken}`,
      },
      body: "{}",
    },
  );

  assert.equal(activation.status, 201);

  const { activationId } = (await activation.json()) as {
    activationId: number;
  };

  const id = randomUUID();

  const report = {
    id,
    activationId,
    staff: "untrusted-staff",
    station: "Station C",
    reportedAt: "2026-11-05T12:04:00Z",
    event: "EN_ROUTE",
  };

  // Two simultaneous submissions must create only one report.
  const [first, second] = await Promise.all([
    postReport(report),
    postReport(report),
  ]);

  assert.equal(first.status, 202);
  assert.equal(second.status, 202);

  const reports = await sql<{ id: string }[]>`
    SELECT id
    FROM position_reports
    WHERE client_report_id = ${id}
  `;

  assert.equal(reports.length, 1);

  // The incident log must also contain exactly one event.
  const events = await sql<{ clientTime: Date }[]>`
    SELECT client_time
    FROM incident_events
    WHERE subject_type = 'position-report'
      AND subject_id = ${reports[0].id}
  `;

  assert.equal(events.length, 1);

  // The original phone timestamp must be preserved.
  assert.equal(events[0].clientTime.toISOString(), "2026-11-05T12:04:00.000Z");

  // The same UUID cannot represent a different action.
  const conflict = await postReport({
    ...report,
    event: "ARRIVED",
  });

  assert.equal(conflict.status, 409);

  const conflictBody = (await conflict.json()) as {
    error: { code: string };
  };

  assert.equal(conflictBody.error.code, "E0007");

  // Stand down the scenario.
  const stoodDown = await fetch(
    `${baseUrl}/api/v1/activations/${activationId}/stand-down`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    },
  );

  assert.equal(stoodDown.status, 200);

  // An already accepted report can still be acknowledged.
  const retryAfterStandDown = await postReport(report);

  assert.equal(retryAfterStandDown.status, 202);

  // But a new report cannot be accepted without an active scenario.
  const newReport = await postReport({
    ...report,
    id: randomUUID(),
  });

  assert.equal(newReport.status, 409);
  // The report was made against the stood-down activation, so it is superseded.
  assert.equal(
    ((await newReport.json()) as { error: { code: string } }).error.code,
    "E1003",
  );

  // No duplicate database rows should have appeared.
  const finalReports = await sql<{ id: string }[]>`
    SELECT id
    FROM position_reports
    WHERE client_report_id = ${id}
  `;

  assert.equal(finalReports.length, 1);
});
