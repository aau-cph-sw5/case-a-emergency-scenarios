// Offline report queue that survives an expired session.
// Rules: docs/adr/0001-session-expiry-and-offline-queue.md
//
// storage: { load(): entries[], save(entries) }. The client supplies it
//   (localStorage, AsyncStorage, file, memory).
// send(report, token): resolves to { status }. The client supplies it
//   and it performs the actual HTTP request.

import { isSessionExpired } from "./session.js";

export function createOfflineQueue({ storage, send, now = Date.now }) {
  function entries() {
    return storage.load() ?? [];
  }

  function enqueue(userId, report) {
    storage.save([
      ...entries(),
      { userId, report, queuedAt: new Date(now()).toISOString() },
    ]);
  }

  function pending(userId) {
    return entries().filter((entry) => entry.userId === userId);
  }

  // Sends the signed-in user's entries in queue order. An entry is removed
  // only when the server accepts it; any other outcome stops the flush and
  // leaves it and everything after it in the queue. Entries belonging to
  // other users are never sent and never removed.
  async function flush({ userId, token }) {
    if (isSessionExpired(token, now())) {
      return { sent: 0, sessionExpired: true };
    }

    let sent = 0;

    for (const entry of pending(userId)) {
      const response = await send(entry.report, token);

      if (response.status >= 200 && response.status < 300) {
        const remaining = entries();
        const index = remaining.findIndex((e) => same(e, entry));
        if (index !== -1) {
          remaining.splice(index, 1);
          storage.save(remaining);
        }
        sent++;
        continue;
      }

      // The server answers 401 for both expired and invalid tokens, so the
      // token's own exp decides whether this was an expired session.
      const sessionExpired =
        response.status === 401 && isSessionExpired(token, now());
      return { sent, sessionExpired };
    }

    return { sent, sessionExpired: false };
  }

  return { enqueue, pending, flush };
}

// Storage may hand back fresh copies, so match entries by value. Only the
// first match is removed, so two identical reports are sent twice, not once.
function same(a, b) {
  return (
    a.userId === b.userId &&
    a.queuedAt === b.queuedAt &&
    JSON.stringify(a.report) === JSON.stringify(b.report)
  );
}
