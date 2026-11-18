import type { SnapshotStorage } from "./scenario-snapshot";

// Why the server refused a queued item for good.
export type RejectionReason = { httpStatus: number; code?: string };

// An item the steward made offline, with the reason once the server refused it.
export type Stored<T> = T & { rejection?: RejectionReason };
export type Rejected<T> = T & { rejection: RejectionReason };

// What every queued item has: the steward it belongs to.
type Owned = { userId: string };

export type OfflineQueueOptions<T extends Owned> = {
  key: string; // where the list is kept in the phone's storage
  idOf: (item: T) => string; // the id the client made, kept across retries
  isItem: (value: unknown) => value is Stored<T>; // a stored entry that is still valid
  reusedIdError: string;
  notFoundError: string;
};

export function isRejectionReason(value: unknown): value is RejectionReason {
  if (typeof value !== "object" || value === null) return false;
  const reason = value as Record<string, unknown>;
  return (
    typeof reason.httpStatus === "number" &&
    Number.isInteger(reason.httpStatus) &&
    reason.httpStatus >= 400 &&
    reason.httpStatus < 500 &&
    (reason.code === undefined || typeof reason.code === "string")
  );
}

// A list of items kept on the phone until the server has them, shared by the
// position reports (MET-A-006) and the station messages (MET-A-029). An item
// the server refused stays, marked with the reason, and is never sent again.
export function createOfflineQueue<T extends Owned>(
  storage: SnapshotStorage,
  { key, idOf, isItem, reusedIdError, notFoundError }: OfflineQueueOptions<T>,
) {
  let lastOperation: Promise<void> = Promise.resolve();

  // Each change reads and writes the whole list, so changes run one at a
  // time, also when the callers do not wait for each other.
  function serialize<R>(operation: () => Promise<R>): Promise<R> {
    const next = lastOperation.then(operation, operation);
    lastOperation = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function read(): Promise<Stored<T>[]> {
    const raw = await storage.getItem(key);
    if (raw === null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return []; // unreadable text: start over instead of blocking new items
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isItem); // keep valid items, skip broken ones
  }

  function write(items: Stored<T>[]): Promise<void> {
    return storage.setItem(key, JSON.stringify(items));
  }

  const isOwn = (userId: string, id: string) => (item: Stored<T>) =>
    item.userId === userId && idOf(item) === id;

  return {
    // Adding the same item twice keeps one copy. Reusing an id for other data fails.
    enqueue(item: T): Promise<void> {
      return serialize(async () => {
        const items = await read();
        const existing = items.find((stored) => idOf(stored) === idOf(item));
        if (existing) {
          const copy = { ...existing };
          delete copy.rejection;
          if (JSON.stringify(copy) !== JSON.stringify(item)) {
            throw new Error(reusedIdError);
          }
          return;
        }
        await write([...items, item]);
      });
    },

    // Items still waiting to be sent, oldest first.
    getPending(userId: string): Promise<T[]> {
      return serialize(async () =>
        (await read()).filter(
          (item) => item.userId === userId && item.rejection === undefined,
        ),
      );
    },

    // Items the server refused, with the reason.
    getRejected(userId: string): Promise<Rejected<T>[]> {
      return serialize(async () =>
        (await read()).filter(
          (item): item is Rejected<T> =>
            item.userId === userId && item.rejection !== undefined,
        ),
      );
    },

    // The server refused the item. It is kept with the first reason.
    reject(userId: string, id: string, reason: RejectionReason): Promise<void> {
      return serialize(async () => {
        const items = await read();
        const index = items.findIndex(isOwn(userId, id));
        if (index < 0) throw new Error(notFoundError);
        if (items[index].rejection !== undefined) return;
        items[index] = { ...items[index], rejection: reason };
        await write(items);
      });
    },

    // The server has the item, so the phone forgets it.
    acknowledge(userId: string, id: string): Promise<void> {
      return serialize(async () => {
        const matches = isOwn(userId, id);
        await write((await read()).filter((item) => !matches(item)));
      });
    },

    // Forgets the refused items the steward no longer needs to see. keep
    // says which refused items stay; pending items are never removed.
    discardRejected(
      userId: string,
      keep: (item: Rejected<T>) => boolean,
    ): Promise<void> {
      return serialize(async () => {
        const items = await read();
        const left = items.filter(
          (item) =>
            item.userId !== userId ||
            item.rejection === undefined ||
            keep(item as Rejected<T>),
        );
        if (left.length !== items.length) await write(left);
      });
    },
  };
}
