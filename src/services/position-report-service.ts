import { createHash } from "node:crypto";
import { getDatabase, type Db } from "../db/client.js";
import {
  findByClientReportId,
  findLatestReport,
  insertPositionReport,
  type NewPositionReport,
  type ReportEvent,
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
    schemaVersion: 3,
    subject: { type: "position-report", id: saved.id },
    // The activation the steward reported against.
    activationId: String(report.activationId),
    // Keeps the location in the log even if the report row is later replaced.
    payload: {
      stationId: report.station,
      taskDone: saved.taskDone,
      event: saved.event,
    },
    clientTime,
  });
  return saved;
}

export type RecordResult =
  | { kind: "saved" }
  | { kind: "repeat" }
  | { kind: "conflict" }
  | { kind: "invalid"; latestStation: string | undefined };

type Latest = Pick<StoredPositionReport, "station" | "event" | "taskDone">;

// Whether a report may follow the steward's latest one in the activation
// (MET-A-015, contract 7.1.0). The latest report says where the steward is: on
// the way, arrived, task done, or free after a cancel, a check-out or no report.
// A repeat is accepted but changes nothing.
export function checkTransition(
  latest: Latest | null,
  station: string,
  next: { event?: ReportEvent; taskDone?: boolean },
): "ok" | "repeat" | "invalid" {
  const there = latest !== null && latest.station === station;
  const now =
    latest === null
      ? "free"
      : latest.taskDone
        ? "done"
        : latest.event === "EN_ROUTE"
          ? "on-the-way"
          : latest.event === "ARRIVED"
            ? "arrived"
            : "free";

  if (next.taskDone === true) {
    if (!there) return "invalid";
    if (now === "done") return "repeat";
    return now === "free" ? "invalid" : "ok";
  }
  switch (next.event ?? "EN_ROUTE") {
    case "EN_ROUTE":
      if (there && now !== "free") return "repeat";
      // Arrived or done somewhere else: check out first.
      return now === "arrived" || now === "done" ? "invalid" : "ok";
    case "ARRIVED":
      if (there && now === "arrived") return "repeat";
      return there && now === "on-the-way" ? "ok" : "invalid";
    case "CANCELLED":
      if (there && latest.event === "CANCELLED") return "repeat";
      return there && now === "on-the-way" ? "ok" : "invalid";
    case "CHECKED_OUT":
      if (there && latest.event === "CHECKED_OUT") return "repeat";
      return there && (now === "arrived" || now === "done") ? "ok" : "invalid";
  }
}

// The lock makes a steward's requests wait for each other, so a double tap
// sees the first one as stored and is a repeat.
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
    const latest = await findLatestReport(tx, staff, activationStartedAt);
    const check = checkTransition(latest, report.station, report);
    if (check === "invalid") {
      return { kind: "invalid", latestStation: latest?.station };
    }
    if (check === "repeat") return { kind: "repeat" };
    await savePositionReport(tx, user, report, clientTime);
    return { kind: "saved" };
  });
}
