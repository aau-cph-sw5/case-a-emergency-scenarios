import type {
  QueuedStationMessage,
  StationMessageQueueStore,
} from "../../../shared/offline/station-message-queue";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { MessageDeliveryResult } from "../api/station-message";
import {
  createFlushCoordinator,
  isFinalRejection,
  rejectionCode,
} from "./queue-delivery";

export type MessageSender = (
  token: string,
  message: QueuedStationMessage,
) => Promise<MessageDeliveryResult>;

export type MessageFlushResult = {
  delivered: StationMessage[]; // as the server stored them, so the thread can replace the pending copies
  rejected: number;
  pending: number;
  blocked: boolean; // stopped early, e.g. no connection; the rest waits for the next flush
  blockedBy?: MessageDeliveryResult; // what stopped the flush, when blocked is true
};

// True when a flush stopped because the server no longer accepts the token
// (MET-A-029, #445). The caller restores the session instead of retrying.
export function isUnauthorized(result: MessageFlushResult): boolean {
  return (
    result.blockedBy?.status === "rejected" &&
    result.blockedBy.httpStatus === 401
  );
}

// Sends a steward's queued messages in the order they were written. The same
// rules as position reports: a refusal about the message itself is final,
// while no connection, authentication and rate limiting keep it queued.
export function createStationMessageDelivery(
  queue: StationMessageQueueStore,
  sender: MessageSender,
) {
  async function flush(
    userId: string,
    token: string,
  ): Promise<MessageFlushResult> {
    const delivered: StationMessage[] = [];
    let rejected = 0;
    let blockedBy: MessageDeliveryResult | undefined;

    for (const message of await queue.getPending(userId)) {
      const result = await sender(token, message);
      if (result.status === "accepted") {
        await queue.acknowledge(userId, message.clientMessageId);
        delivered.push(result.message);
      } else if (isFinalRejection(result)) {
        const code = rejectionCode(result);
        await queue.reject(userId, message.clientMessageId, {
          httpStatus: result.httpStatus,
          ...(code === undefined ? {} : { code }),
        });
        rejected++;
      } else {
        // Later messages wait too, so the thread keeps the order they were written in.
        blockedBy = result;
        break;
      }
    }

    return {
      delivered,
      rejected,
      pending: (await queue.getPending(userId)).length,
      blocked: blockedBy !== undefined,
      ...(blockedBy ? { blockedBy } : {}),
    };
  }

  return { flush: createFlushCoordinator(flush) };
}
