import { createHash } from "node:crypto";
import { getDatabase, type Db } from "../db/client.js";
import {
  findByClientReportId,
  findLatestReport,
  insertPositionReport,
  type NewPositionReport,
  type StoredPositionReport,
} from "../repositories/position-report-repository.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;
type ReplayResult = "repeat" | "conflict";
function hashClientRequest(
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        staff: String(user.userId),
        station: report.station,
        reportedAt: clientTime.toISOString(),
        event: report.event ?? "EN_ROUTE",
        taskDone: report.taskDone ?? false,
      }),
    )
    .digest("hex");
}

// Determine whether this UUID belongs to an already accepted action.
async function alreadyAccepted(
  tx: Db,
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
): Promise<ReplayResult | null> {
  if (!report.id) return null;

  const existing = await findByClientReportId(tx, report.id);
  if (!existing) return null;

  const sameRequest =
    existing.staff === String(user.userId) &&
    existing.clientRequestHash === hashClientRequest(user, report, clientTime);

  return sameRequest ? "repeat" : "conflict";
}

export function checkPositionReportReplay(
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
): Promise<ReplayResult | null> {
  const clientReportId = report.id;
  if (!clientReportId) {
    return Promise.resolve(null);
  }
  return getDatabase().begin(async (tx) => {
    await tx`
      SELECT pg_advisory_xact_lock(hashtext(${clientReportId}))
    `;
    return alreadyAccepted(tx, user, report, clientTime);
  });
}

export async function savePositionReport(
  tx: Db,
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
  writeEvent: WriteEvent = appendEvent,
): Promise<StoredPositionReport> {
  const saved = await insertPositionReport(
    tx,
    report,
    report.id ? hashClientRequest(user, report, clientTime) : null,
  );
  await writeEvent(tx, user, {
    type: "POSITION_REPORTED",
    schemaVersion: 2,
    subject: { type: "position-report", id: saved.id },
    // Keeps the location in the log even if the report row is later replaced.
    payload: { stationId: report.station, taskDone: saved.taskDone },
    clientTime,
  });
  return saved;
}

export type RecordResult =
  | { kind: "saved" }
  | { kind: "repeat" }
  | { kind: "conflict" }
  | { kind: "invalid"; latestStation: string | undefined };

// A task done is only allowed at the station of the steward's latest report in
// the activation (MET-A-015), and sending it again changes nothing. The lock
// makes a steward's requests wait for each other, so a double tap sees the
// first one as stored and is a repeat.

export function recordPositionReport(
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
  activationStartedAt: string,
): Promise<RecordResult> {
  // The controller puts the userId from the token in staff, as a number.
  const staff = String(report.staff);
  return getDatabase().begin(async (tx): Promise<RecordResult> => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${staff}))`;
    // Check whether this client UUID was already processed.
    if (report.id) {
      // Prevent concurrent submissions of the same report.
      await tx`SELECT pg_advisory_xact_lock(hashtext(${report.id}))`;
      const replay = await alreadyAccepted(tx, user, report, clientTime);
      if (replay) {
        return { kind: replay };
      }
    }
    if (report.taskDone === true) {
      const latest = await findLatestReport(tx, staff, activationStartedAt);
      if (latest === null || latest.station !== report.station) {
        return { kind: "invalid", latestStation: latest?.station };
      }
      if (latest.taskDone) {
        return { kind: "repeat" };
      }
    }
    await savePositionReport(tx, user, report, clientTime);
    return { kind: "saved" };
  });
}
