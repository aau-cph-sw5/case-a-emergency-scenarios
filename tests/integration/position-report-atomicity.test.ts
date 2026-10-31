import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import { appendEvent } from "../../src/services/incident-log-service.js";
import { savePositionReport } from "../../src/services/position-report-service.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  seedTestScenarios,
} from "./helpers.js";

const sql = getDatabase();
// The application may not delete position reports, so cleanup runs as the owner.
const owner = getOwnerDatabase();
let steward: AuthUser;
let operatorUsername: string;
let stewardUsername: string;

let server: Server;
let baseUrl: string;

before(async () => {
  const users = await seedTestUsers("atomic-");
  await seedTestScenarios();
  const operator = users.find((user) => user.role === "OPERATOR")!;
  const stewardAccount = users.find((user) => user.role === "STEWARD")!;
  operatorUsername = operator.username;
  stewardUsername = stewardAccount.username;
  steward = {
    userId: stewardAccount.id,
    role: stewardAccount.role,
    jti: "test-only-jti",
  };

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
  await closeOwnerDatabase();
});

class Rollback extends Error {}

// A fresh `staff` value per test lets a test find its own rows afterwards.
function aReport() {
  return {
    staff: `steward-${randomUUID()}`,
    station: "Station B",
    reportedAt: "2026-09-23T08:10:00Z",
  };
}

function reportsBy(staff: string) {
  return sql<{ id: string }[]>`
    SELECT id FROM position_reports WHERE staff = ${staff}
  `;
}

type LoggedEvent = {
  type: string;
  actorId: string;
  payload: unknown;
  clientTime: Date;
};

function eventsAbout(reportId: string) {
  return sql<LoggedEvent[]>`
    SELECT type, actor_id, payload, client_time FROM incident_events
    WHERE subject_type = 'position-report' AND subject_id = ${reportId}
  `;
}

async function loginToken(
  username: string,
  password: string,
  client: "web" | "mobile",
) {
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return ((await login.json()) as { token: string }).token;
}

test("a position report and its event are stored together, with the actor from the token", async () => {
  // The endpoint only accepts stations of an active scenario. Station C is only
  // in DEMO-003, and no other test file reports on it, so the row is ours.
  const operatorToken = await loginToken(
    operatorUsername,
    "operator123",
    "web",
  );
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

  await owner`DELETE FROM position_reports WHERE station = 'Station C'`;
  const stewardToken = await loginToken(
    stewardUsername,
    "steward123",
    "mobile",
  );

  // The client claims `staff` is somebody else. The token decides.
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stewardToken}`,
    },
    body: JSON.stringify({
      staff: "someone-else",
      station: "Station C",
      reportedAt: "2026-09-23T08:10:00Z",
    }),
  });

  assert.equal(response.status, 202);
  const saved = await sql<{ id: string; staff: string }[]>`
    SELECT id, staff FROM position_reports WHERE station = 'Station C'
  `;
  assert.equal(saved.length, 1);
  try {
    assert.equal(saved[0].staff, String(steward.userId));
    const events = await eventsAbout(saved[0].id);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "POSITION_REPORTED");
    assert.equal(events[0].actorId, String(steward.userId));
    // The station stays in the log even if the report row is replaced later.
    assert.deepEqual(events[0].payload, {
      stationId: "Station C",
      taskDone: false,
    });
    assert.equal(
      events[0].clientTime.toISOString(),
      "2026-09-23T08:10:00.000Z",
    );
  } finally {
    // The event stays: the log is append-only.
    await owner`DELETE FROM position_reports WHERE id = ${saved[0].id}`;
  }
});

test("rolling back the change writes no event", async () => {
  const report = aReport();
  let reportId = "";

  await assert.rejects(
    sql.begin(async (tx) => {
      const saved = await savePositionReport(tx, steward, report, new Date());
      reportId = saved.id;
      // Inside the transaction both rows exist.
      assert.equal(
        (await tx`SELECT 1 FROM position_reports WHERE id = ${reportId}`)
          .length,
        1,
      );
      assert.equal(
        (await tx`SELECT 1 FROM incident_events WHERE subject_id = ${reportId}`)
          .length,
        1,
      );
      throw new Rollback();
    }),
    Rollback,
  );

  assert.equal((await reportsBy(report.staff)).length, 0);
  assert.equal((await eventsAbout(reportId)).length, 0);
});

test("a failing event write rolls back the change", async () => {
  const report = aReport();
  // The database rejects this type name, so the event write really fails.
  const writeInvalidEvent: typeof appendEvent = (db, user, event) =>
    appendEvent(db, user, { ...event, type: "not a valid type" });

  await assert.rejects(
    sql.begin((tx) =>
      savePositionReport(tx, steward, report, new Date(), writeInvalidEvent),
    ),
    (error: unknown) => (error as { code?: string }).code === "23514",
  );

  assert.equal((await reportsBy(report.staff)).length, 0);
});
