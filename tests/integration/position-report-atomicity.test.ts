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

const sql = getDatabase();
const steward: AuthUser = { userId: "steward-test", role: "STEWARD" };

let server: Server;
let baseUrl: string;

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
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

function eventsAbout(reportId: string) {
  return sql<{ type: string; actorId: string }[]>`
    SELECT type, actor_id FROM incident_events
    WHERE subject_type = 'position-report' AND subject_id = ${reportId}
  `;
}

test("a position report and its event are stored together, with the actor from the token", async () => {
  const report = aReport();
  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "steward-test",
      password: "steward-test-pw",
    }),
  });
  const { token } = (await login.json()) as { token: string };

  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(report),
  });

  assert.equal(response.status, 202);
  const [saved] = await reportsBy(report.staff);
  assert.ok(saved);
  try {
    const events = await eventsAbout(saved.id);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, "POSITION_REPORTED");
    // The report claims `staff` is somebody else. The token decides.
    assert.equal(events[0].actorId, "steward-test");
  } finally {
    // The event stays: the log is append-only.
    await sql`DELETE FROM position_reports WHERE id = ${saved.id}`;
  }
});

test("rolling back the change writes no event", async () => {
  const report = aReport();
  let reportId = "";

  await assert.rejects(
    sql.begin(async (tx) => {
      const saved = await savePositionReport(tx, steward, report);
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
      savePositionReport(tx, steward, report, writeInvalidEvent),
    ),
    (error: unknown) => (error as { code?: string }).code === "23514",
  );

  assert.equal((await reportsBy(report.staff)).length, 0);
});
