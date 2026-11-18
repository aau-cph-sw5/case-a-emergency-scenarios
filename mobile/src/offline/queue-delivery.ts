// Shared by the delivery of position reports (MET-A-006) and station messages (MET-A-029).

// Only domain/validation 4xx failures are terminal. Authentication and rate
// limiting failures must leave the queue intact for another attempt.
const RETRYABLE_HTTP_STATUSES = new Set([401, 403, 408, 429]);

// True when the server refused an item for good, so it is not sent again.
export function isFinalRejection(result: {
  status: string;
  httpStatus?: number;
}): result is { status: "rejected"; httpStatus: number; code?: string } {
  return (
    result.status === "rejected" &&
    result.httpStatus !== undefined &&
    result.httpStatus >= 400 &&
    result.httpStatus < 500 &&
    !RETRYABLE_HTTP_STATUSES.has(result.httpStatus)
  );
}

// The refusal's error code, when the server sent one.
export function rejectionCode(result: object): string | undefined {
  return "code" in result && typeof result.code === "string"
    ? result.code
    : undefined;
}

// Runs one flush per steward at a time, so an item is never sent twice in
// parallel. A caller who comes while a flush runs gets one more flush after
// it, since the running one may have read the queue before the caller's item.
export function createFlushCoordinator<R>(
  flushOnce: (userId: string, token: string) => Promise<R>,
) {
  const activeFlushes = new Map<string, Promise<R>>();
  const nextFlushes = new Map<string, Promise<R>>();

  // Runs one flush for the user and forgets it once it has finished.
  function start(userId: string, token: string): Promise<R> {
    const running = flushOnce(userId, token);
    activeFlushes.set(userId, running);
    const forget = () => {
      if (activeFlushes.get(userId) === running) activeFlushes.delete(userId);
    };
    void running.then(forget, forget);
    return running;
  }

  return function flush(userId: string, token: string): Promise<R> {
    const active = activeFlushes.get(userId);
    if (active === undefined) return start(userId, token);

    const queued = nextFlushes.get(userId);
    if (queued !== undefined) return queued;
    const next = active
      .catch(() => undefined)
      .then(() => {
        nextFlushes.delete(userId);
        return start(userId, token);
      });
    nextFlushes.set(userId, next);
    return next;
  };
}
