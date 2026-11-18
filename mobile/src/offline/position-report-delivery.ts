import { ERROR_CODES } from "../../../shared/error-codes";
import type {
  PositionReportQueueStore,
  QueuedPositionReport,
} from "../../../shared/offline/position-report-queue";
import type { ReportDeliveryResult } from "../api/position-report";
import {
  createFlushCoordinator,
  isFinalRejection,
  rejectionCode,
} from "./queue-delivery";

export type ReportSender = (
  token: string,
  report: QueuedPositionReport,
) => Promise<ReportDeliveryResult>;

export type FlushResult = {
  acknowledged: number;
  rejected: number;
  pending: number;
  blockedBy?: ReportDeliveryResult;
  // Rejected in this flush with E1003: the scenario changed after the report was made.
  superseded: QueuedPositionReport[];
};

export function createPositionReportDelivery(
  queue: PositionReportQueueStore,
  sender: ReportSender,
) {
  async function flush(userId: string, token: string): Promise<FlushResult> {
    const reports = await queue.getPending(userId);
    let acknowledged = 0;
    let rejected = 0;
    let blockedBy: ReportDeliveryResult | undefined;
    const superseded: QueuedPositionReport[] = [];

    for (const report of reports) {
      const result = await sender(token, report);

      if (result.status === "accepted") {
        await queue.acknowledge(userId, report.id);
        acknowledged++;
      } else if (isFinalRejection(result)) {
        const code = rejectionCode(result);
        await queue.reject(userId, report.id, {
          httpStatus: result.httpStatus,
          ...(code === undefined ? {} : { code }),
        });
        rejected++;
        if (code === ERROR_CODES.SCENARIO_STOOD_DOWN) superseded.push(report);
      } else {
        blockedBy = result;
        break;
      }
    }

    return {
      acknowledged,
      rejected,
      pending: (await queue.getPending(userId)).length,
      superseded,
      ...(blockedBy ? { blockedBy } : {}),
    };
  }

  return { flush: createFlushCoordinator(flush) };
}
