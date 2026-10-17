import { getDatabase, type Db } from "../db/client.js";
import {
  insertPositionReport,
  type NewPositionReport,
  type PositionReport,
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
// The actor is the user from the token, not the `staff` field of the report.
// `staff` says who the report is about, and the client chooses it.
export async function savePositionReport(
  tx: Db,
  user: AuthUser,
  report: NewPositionReport,
  writeEvent: WriteEvent = appendEvent,
): Promise<PositionReport> {
  const saved = await insertPositionReport(tx, report);

  await writeEvent(tx, user, {
    type: "POSITION_REPORTED",
    schemaVersion: 1,
    subject: { type: "position-report", id: saved.id },
    clientTime: new Date(report.reportedAt),
  });

  return saved;
}

export function recordPositionReport(
  user: AuthUser,
  report: NewPositionReport,
): Promise<PositionReport> {
  return getDatabase().begin((tx) => savePositionReport(tx, user, report));
}
