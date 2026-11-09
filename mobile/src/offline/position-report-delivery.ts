import type {
  PositionReportQueueStore,
  QueuedPositionReport,
} from "../../../shared/offline/position-report-queue";
import type { ReportDeliveryResult } from "../api/position-report";

export type ReportSender = (
  token: string,
  report: QueuedPositionReport,
) => Promise<ReportDeliveryResult>;

export type FlushResult = {
  acknowledged: number;
  rejected: number;
  pending: number;
  blockedBy?: ReportDeliveryResult;
};

// Only domain/validation 4xx failures are terminal. Authentication and rate
// limiting failures must leave the queue intact for another attempt.
const RETRYABLE_HTTP_STATUSES = new Set([401, 403, 408, 429]);

export function createPositionReportDelivery(
  queue: PositionReportQueueStore,
  sender: ReportSender,
) {
  const activeFlushes = new Map<string, Promise<FlushResult>>();

  async function flush(userId: string, token: string): Promise<FlushResult> {
    const reports = await queue.getPending(userId);
    let acknowledged = 0;
    let rejected = 0;
    let blockedBy: ReportDeliveryResult | undefined;

    for (const report of reports) {
      const result = await sender(token, report);

      if (result.status === "accepted") {
        await queue.acknowledge(userId, report.id);
        acknowledged++;
      } else if (
        result.status === "rejected" &&
        result.httpStatus >= 400 &&
        result.httpStatus < 500 &&
        !RETRYABLE_HTTP_STATUSES.has(result.httpStatus)
      ) {
        const code =
          "code" in result && typeof result.code === "string"
            ? result.code
            : undefined;
        await queue.reject(userId, report.id, {
          httpStatus: result.httpStatus,
          ...(code === undefined ? {} : { code }),
        });
        rejected++;
      } else {
        blockedBy = result;
        break;
      }
    }

    return {
      acknowledged,
      rejected,
      pending: (await queue.getPending(userId)).length,
      ...(blockedBy ? { blockedBy } : {}),
    };
  }

  return {
    flush(userId: string, token: string): Promise<FlushResult> {
      const active = activeFlushes.get(userId);
      if (active !== undefined) return active;

      const running = flush(userId, token);
      activeFlushes.set(userId, running);
      void running.then(
        () => {
          if (activeFlushes.get(userId) === running)
            activeFlushes.delete(userId);
        },
        () => {
          if (activeFlushes.get(userId) === running)
            activeFlushes.delete(userId);
        },
      );
      return running;
    },
  };
}
