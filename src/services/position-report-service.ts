import { getDatabase, type Db } from "../db/client.js";
import {
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
    schemaVersion: 1,
    subject: { type: "position-report", id: saved.id },
    // Keeps the location in the log even if the report row is later replaced.
    payload: { stationId: report.station },
    clientTime,
  });

  return saved;
}

export function recordPositionReport(
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
): Promise<StoredPositionReport> {
  return getDatabase().begin((tx) =>
    savePositionReport(tx, user, report, clientTime),
  );
}

