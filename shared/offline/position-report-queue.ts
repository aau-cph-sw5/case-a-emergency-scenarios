import {
  createOfflineQueue,
  isRejectionReason,
  type Rejected,
  type Stored,
} from "./offline-queue";
import type { SnapshotStorage } from "./scenario-snapshot";

export const POSITION_REPORT_QUEUE_KEY = "metro-pending-position-reports"; //stores the reports that have been queued for delivery to the server

export type PositionReportEvent =
  "EN_ROUTE" | "ARRIVED" | "CANCELLED" | "CHECKED_OUT";

export type QueuedPositionReport = {
  id: string; //stable id for duplicate detection
  userId: string; //what steward
  station: string; //station where the report was made
  reportedAt: string;
  scenarioId: string; //scenario the report wwas created against
  activationId: number; //specific activation the steward was participating in
  event?: PositionReportEvent;
  taskDone?: boolean;
};

export type { RejectionReason } from "./offline-queue";
export type RejectedPositionReport = Rejected<QueuedPositionReport>;
type StoredPositionReport = Stored<QueuedPositionReport>;

export type PositionReportQueueStore = ReturnType<
  typeof createPositionReportQueueStore
>;

function isQueuedReport(value: unknown): value is StoredPositionReport {
  //unknown type guard to check if the value is a QueuedPositionReport
  if (typeof value !== "object" || value === null) return false;

  const report = value as Record<string, unknown>; //cast value to a record with string keys and unknown types

  return (
    typeof report.id === "string" &&
    typeof report.userId === "string" &&
    typeof report.station === "string" &&
    typeof report.reportedAt === "string" &&
    !Number.isNaN(Date.parse(report.reportedAt)) &&
    typeof report.scenarioId === "string" &&
    typeof report.activationId === "number" &&
    Number.isInteger(report.activationId) &&
    report.activationId > 0 &&
    (report.taskDone === undefined || typeof report.taskDone === "boolean") &&
    (report.event === undefined ||
      report.event === "EN_ROUTE" ||
      report.event === "ARRIVED" ||
      report.event === "CANCELLED" ||
      report.event === "CHECKED_OUT") &&
    (report.event === undefined || report.taskDone === undefined) &&
    (report.rejection === undefined || isRejectionReason(report.rejection))
  );
}

export function createPositionReportQueueStore(storage: SnapshotStorage) {
  //creates a store for queued position reports using storage mechanism
  return createOfflineQueue<QueuedPositionReport>(storage, {
    key: POSITION_REPORT_QUEUE_KEY,
    idOf: (report) => report.id,
    isItem: isQueuedReport,
    reusedIdError: "Report ID already used for different data",
    notFoundError: "Queued report not found",
  });
}
