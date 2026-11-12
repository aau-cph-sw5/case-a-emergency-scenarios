import type {
  QueuedPositionReport,
  RejectionReason,
} from "../../../shared/offline/position-report-queue";
import { positionReportQueueStore } from "./position-report-queue-store";

// The newest report for the activation that is saved on the phone but not delivered yet.
export async function waitingReport(
  userId: string,
  activationId: number,
): Promise<QueuedPositionReport | null> {
  const pending = (await positionReportQueueStore.getPending(userId)).filter(
    (report) => report.activationId === activationId,
  );
  return pending[pending.length - 1] ?? null;
}

// Why the server refused a queued report, null while it waits or after it was accepted.
export async function reportRejection(
  userId: string,
  id: string,
): Promise<RejectionReason | null> {
  const rejected = await positionReportQueueStore.getRejected(userId);
  return rejected.find((report) => report.id === id)?.rejection ?? null;
}
