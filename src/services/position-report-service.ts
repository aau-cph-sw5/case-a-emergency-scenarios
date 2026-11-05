import { getDatabase, type Db } from "../db/client.js";
import {
  findLatestReport,
  insertPositionReport,
  type NewPositionReport,
  type StoredPositionReport,
} from "../repositories/position-report-repository.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;

// Stores the report and its POSITION_REPORTED event with the transaction it is
// given, so both commit together or neither does. This is the pattern every
// state-changing action follows: make the change with tx, then appendEvent with
// the same tx.
//
// The actor is the user from the token. `clientTime` is the phone's own time,
// which the controller replaces in `report.reportedAt`.
export async function savePositionReport(
  tx: Db,
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
  writeEvent: WriteEvent = appendEvent,
): Promise<StoredPositionReport> {
  const saved = await insertPositionReport(tx, report);

  await writeEvent(tx, user, {
    type: "POSITION_REPORTED",
    schemaVersion: 3,
    subject: { type: "position-report", id: saved.id },
    // Keeps the location in the log even if the report row is later replaced.
    payload: {
      stationId: report.station,
      taskDone: saved.taskDone,
      event: typeof report.event === "string" ? report.event : "EN_ROUTE",
    },
    clientTime,
  });

  return saved;
}

export type RecordResult =
  | { kind: "saved" }
  | { kind: "repeat" }
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
    if (report.taskDone === true) {
      const latest = await findLatestReport(tx, staff, activationStartedAt);
      if (latest === null || latest.station !== report.station) {
        return { kind: "invalid", latestStation: latest?.station };
      }
      if (latest.taskDone) return { kind: "repeat" };
    }
    await savePositionReport(tx, user, report, clientTime);
    return { kind: "saved" };
  });
}
