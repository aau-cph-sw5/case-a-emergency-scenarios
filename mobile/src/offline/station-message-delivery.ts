import type {
  QueuedStationMessage,
  StationMessageQueueStore,
} from "../../../shared/offline/station-message-queue";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { MessageDeliveryResult } from "../api/station-message";

export type MessageSender = (
  token: string,
  message: QueuedStationMessage,
) => Promise<MessageDeliveryResult>;

export type MessageFlushResult = {
  delivered: StationMessage[]; // as the server stored them, so the thread can replace the pending copies
  rejected: number;
  pending: number;
  blocked: boolean; // stopped early, e.g. no connection; the rest waits for the next flush
};

// The same rule as position reports: a refusal about the message itself is
// final, while authentication, timeouts and rate limiting keep it queued.
const RETRYABLE_HTTP_STATUSES = new Set([401, 403, 408, 429]);

function isFinal(
  result: MessageDeliveryResult,
): result is Extract<MessageDeliveryResult, { status: "rejected" }> {
  return (
    result.status === "rejected" &&
    result.httpStatus >= 400 &&
    result.httpStatus < 500 &&
    !RETRYABLE_HTTP_STATUSES.has(result.httpStatus)
  );
}

// Sends a steward's queued messages in the order they were written.
export function createStationMessageDelivery(
  queue: StationMessageQueueStore,
  sender: MessageSender,
) {
  // One flush per steward at a time, so a message is never sent twice in parallel.
  const running = new Map<string, Promise<MessageFlushResult>>();
  const following = new Map<string, Promise<MessageFlushResult>>();

  async function sendAll(
    userId: string,
    token: string,
  ): Promise<MessageFlushResult> {
    const delivered: StationMessage[] = [];
    let rejected = 0;
    let blocked = false;

    for (const message of await queue.getPending(userId)) {
      const result = await sender(token, message);
      if (result.status === "accepted") {
        await queue.acknowledge(userId, message.clientMessageId);
        delivered.push(result.message);
      } else if (isFinal(result)) {
        await queue.reject(userId, message.clientMessageId, {
          httpStatus: result.httpStatus,
          ...(result.code === undefined ? {} : { code: result.code }),
        });
        rejected++;
      } else {
        // Later messages wait too, so the thread keeps the order they were written in.
        blocked = true;
        break;
      }
    }

    return {
      delivered,
      rejected,
      pending: (await queue.getPending(userId)).length,
      blocked,
    };
  }

  function start(userId: string, token: string): Promise<MessageFlushResult> {
    const flush = sendAll(userId, token);
    running.set(userId, flush);
    const forget = () => {
      if (running.get(userId) === flush) running.delete(userId);
    };
    flush.then(forget, forget);
    return flush;
  }

  return {
    flush(userId: string, token: string): Promise<MessageFlushResult> {
      const active = running.get(userId);
      if (active === undefined) return start(userId, token);

      // The running flush may have read the queue before this caller's message, so one more follows.
      const queued = following.get(userId);
      if (queued !== undefined) return queued;
      const next = active
        .catch(() => undefined)
        .then(() => {
          following.delete(userId);
          return start(userId, token);
        });
      following.set(userId, next);
      return next;
    },
  };
}
