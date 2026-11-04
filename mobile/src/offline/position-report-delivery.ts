import type { //importing types from the shared position report queue module
  PositionReportQueueStore,
  QueuedPositionReport,
} from "../../../shared/offline/position-report-queue";

import type { ReportDeliveryResult } from "../api/position-report"; //importing the ReportDeliveryResult type from the API module

export type ReportSender = (
  token: string,
  report: QueuedPositionReport,
) => Promise<ReportDeliveryResult>;

export type FlushResult = { //represents the result of flushing the position report queue
  acknowledged: number;
  pending: number;
  blockedBy?: ReportDeliveryResult;
};

export function createPositionReportDelivery( //creates a position report delivery mechanism that handles flushing queued reports to the server
  queue: PositionReportQueueStore,
  sender: ReportSender,
) {
  const activeFlushes = new Map<string, Promise<FlushResult>>(); //keeps track of the currently active flush operation, if any

  async function flush( //flushes the queued position reports for a specific user by sending them to the server
    userId: string,
    token: string,
  ): Promise<FlushResult> {
    const reports = await queue.getPending(userId);

    let acknowledged = 0; //keeps track of the number of reports that have been successfully acknowledged by the server
    let blockedBy: ReportDeliveryResult | undefined;

    for (const report of reports) { //iterates through each pending report for the user
      const result = await sender(token, report);

      if (result.status !== "accepted") { //if the report was not accepted by the server, stop processing further reports and mark this result as blocking
        blockedBy = result;
        break;
      }

      await queue.acknowledge(userId, report.id); //removes the acknowledged report from the queue for the user
      acknowledged++;
    }

    return { //returns the result of the flush operation, including the number of acknowledged reports, the number of pending reports, and any blocking result if applicable
      acknowledged,
      pending: (await queue.getPending(userId)).length,
      ...(blockedBy ? { blockedBy } : {}),
    };
  }


  return {
    flush(userId: string, token: string): Promise<FlushResult> {
      // If this user already has a flush running, reuse it.
      const active = activeFlushes.get(userId);

      if (active !== undefined) {
        return active;
      }

      // Otherwise start a new flush for this user.
      const running = flush(userId, token);

      activeFlushes.set(userId, running);

      // Remove only this user's completed operation.
      void running.then(
        () => {
          if (activeFlushes.get(userId) === running) {
            activeFlushes.delete(userId);
          }
        },
        () => {
          if (activeFlushes.get(userId) === running) {
            activeFlushes.delete(userId);
          }
        },
      );

      return running;
    },
  };
}