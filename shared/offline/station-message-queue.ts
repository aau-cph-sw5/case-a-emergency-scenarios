import type { SnapshotStorage } from "./scenario-snapshot";
import type { RejectionReason } from "./position-report-queue";

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

export type RejectedStationMessage = QueuedStationMessage & {
  rejection: RejectionReason;
};

type StoredStationMessage = QueuedStationMessage & {
  rejection?: RejectionReason;
};

export type StationMessageQueueStore = ReturnType<
  typeof createStationMessageQueueStore
>;

function isRejection(value: unknown): value is RejectionReason {
  if (typeof value !== "object" || value === null) return false;
  const { httpStatus, code } = value as Record<string, unknown>;
  return (
    Number.isInteger(httpStatus) &&
    (httpStatus as number) >= 400 &&
    (httpStatus as number) < 500 &&
    (code === undefined || typeof code === "string")
  );
}

function isStoredMessage(value: unknown): value is StoredStationMessage {
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
    (message.rejection === undefined || isRejection(message.rejection))
  );
}

// Keeps station messages in the phone's storage until the server has them.
// A message the server refused stays, marked with the reason, so the thread
// can show it as not sent. It is never sent again.
export function createStationMessageQueueStore(storage: SnapshotStorage) {
  let last: Promise<void> = Promise.resolve();

  // Each change reads and writes the whole list, so changes run one at a time.
  function inOrder<T>(operation: () => Promise<T>): Promise<T> {
    const next = last.then(operation, operation);
    last = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function read(): Promise<StoredStationMessage[]> {
    const raw = await storage.getItem(STATION_MESSAGE_QUEUE_KEY);
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isStoredMessage) : [];
    } catch {
      return []; // unreadable text: start over rather than block new messages
    }
  }

  function write(messages: StoredStationMessage[]): Promise<void> {
    return storage.setItem(STATION_MESSAGE_QUEUE_KEY, JSON.stringify(messages));
  }

  const isOwn =
    (userId: string, clientMessageId: string) =>
    (message: StoredStationMessage) =>
      message.userId === userId && message.clientMessageId === clientMessageId;

  return {
    // Adding the same message twice keeps one copy.
    enqueue(message: QueuedStationMessage): Promise<void> {
      return inOrder(async () => {
        const messages = await read();
        const existing = messages.find(
          (item) => item.clientMessageId === message.clientMessageId,
        );
        if (existing) {
          const stored = { ...existing };
          delete stored.rejection;
          if (JSON.stringify(stored) !== JSON.stringify(message)) {
            throw new Error("Message id already used for a different message");
          }
          return;
        }
        await write([...messages, message]);
      });
    },

    // Messages still waiting to be sent, oldest first.
    getPending(userId: string): Promise<QueuedStationMessage[]> {
      return inOrder(async () =>
        (await read()).filter(
          (message) =>
            message.userId === userId && message.rejection === undefined,
        ),
      );
    },

    // Messages the server refused, shown as not sent.
    getRejected(userId: string): Promise<RejectedStationMessage[]> {
      return inOrder(async () =>
        (await read()).filter(
          (message): message is RejectedStationMessage =>
            message.userId === userId && message.rejection !== undefined,
        ),
      );
    },

    // The server stored the message, so the phone forgets it.
    acknowledge(userId: string, clientMessageId: string): Promise<void> {
      return inOrder(async () => {
        const matches = isOwn(userId, clientMessageId);
        await write((await read()).filter((message) => !matches(message)));
      });
    },

    // The server refused the message. It is kept with the reason and not sent again.
    reject(
      userId: string,
      clientMessageId: string,
      reason: RejectionReason,
    ): Promise<void> {
      return inOrder(async () => {
        const messages = await read();
        const index = messages.findIndex(isOwn(userId, clientMessageId));
        if (index < 0) throw new Error("Queued message not found");
        if (messages[index].rejection !== undefined) return;
        messages[index] = { ...messages[index], rejection: reason };
        await write(messages);
      });
    },
  };
}
