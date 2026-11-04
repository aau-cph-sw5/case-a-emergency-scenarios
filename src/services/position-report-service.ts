import { createHash } from "node:crypto";
import { getDatabase, type Db } from "../db/client.js";
import {
  findPositionReportById,
  insertPositionReport,
  type NewPositionReport,
  type StoredPositionReport,
} from "../repositories/position-report-repository.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

export type SavePositionReportResult =
  | {
      status: "created";
      report: StoredPositionReport;
    }
  | {
      status: "duplicate";
      report: StoredPositionReport;
    }
  | {
      status: "conflict";
    };

function fingerprintPositionReport( // Generates a fingerprint of the request body
  report: NewPositionReport,
  clientTime: Date,
): string {
  const contents = { // The contents that must be identical for a retry to be accepted.
    staff: report.staff,
    station: report.station,
    reportedAt: clientTime.toISOString(),
    taskDone:
      typeof report.taskDone === "boolean"
        ? report.taskDone
        : null,
  };

  return createHash("sha256")
    .update(JSON.stringify(contents))
    .digest("hex");
}


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
):  Promise<SavePositionReportResult> {
  const requestFingerprint = fingerprintPositionReport(
    report,
    clientTime,
  );

  const saved = await insertPositionReport(
    tx,
    report,
    requestFingerprint,
  );

  if (saved === null) {
    const existing = await findPositionReportById(tx, report.id);

    if (
      existing !== null &&
      existing.staff === String(user.userId) &&
      existing.requestFingerprint === requestFingerprint
    ) {
      return {
        status: "duplicate",
        report: existing,
      };
    }

    return { status: "conflict" };
  }

  await writeEvent(tx, user, {
    type: "POSITION_REPORTED",
    schemaVersion: 1,
    subject: {
      type: "position-report",
      id: saved.id,
    },
    payload: {
      stationId: report.station,
    },
    clientTime,
  });

  return {
    status: "created",
    report: saved,
  };
}

export function recordPositionReport(
  user: AuthUser,
  report: NewPositionReport,
  clientTime: Date,
): Promise<SavePositionReportResult> {
  return getDatabase().begin((tx) =>
    savePositionReport(tx, user, report, clientTime),
  );
}
