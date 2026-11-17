import {
  createOfflineQueue,
  isRejectionReason,
  type Rejected,
  type Stored,
} from "./offline-queue";
import type { SnapshotStorage } from "./scenario-snapshot";

// Station messages written on the phone and not yet stored by the server (MET-A-029).
export const STATION_MESSAGE_QUEUE_KEY = "metro-pending-station-messages";

export type QueuedStationMessage = {
  clientMessageId: string; // made when the message is written, kept across retries
  userId: string; // the steward who wrote it, so another login on the phone does not send it
  station: string; // the thread the message belongs to
  activationId: number; // the activation the steward saw when writing
  text: string;
  writtenAt: string; // the device's clock when the message was written
};

export type RejectedStationMessage = Rejected<QueuedStationMessage>;

export type StationMessageQueueStore = ReturnType<
  typeof createStationMessageQueueStore
>;

function isStoredMessage(
  value: unknown,
): value is Stored<QueuedStationMessage> {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.clientMessageId === "string" &&
    typeof message.userId === "string" &&
    typeof message.station === "string" &&
    Number.isInteger(message.activationId) &&
    (message.activationId as number) > 0 &&
    typeof message.text === "string" &&
    typeof message.writtenAt === "string" &&
    !Number.isNaN(Date.parse(message.writtenAt)) &&
    (message.rejection === undefined || isRejectionReason(message.rejection))
  );
}

// Keeps station messages in the phone's storage until the server has them.
// A message the server refused stays, marked with the reason, so the thread
// can show it as not sent. It is never sent again.
export function createStationMessageQueueStore(storage: SnapshotStorage) {
  const queue = createOfflineQueue<QueuedStationMessage>(storage, {
    key: STATION_MESSAGE_QUEUE_KEY,
    idOf: (message) => message.clientMessageId,
    isItem: isStoredMessage,
    reusedIdError: "Message id already used for a different message",
    notFoundError: "Queued message not found",
  });

  return {
    ...queue,
    // A thread is closed and removed at stand-down, so refused messages of
    // any other activation are forgotten. Refused messages are not stored on
    // the server either. null means the steward is in no active scenario.
    discardEndedRejections(
      userId: string,
      activeActivationId: number | null,
    ): Promise<void> {
      return queue.discardRejected(
        userId,
        (message) => message.activationId === activeActivationId,
      );
    },
  };
}
