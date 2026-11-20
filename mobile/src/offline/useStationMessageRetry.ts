import { useEffect, useRef } from "react";
import { userIdFromToken } from "../../../shared/auth/login";
import { socket } from "../socket";
import { RETRY_DELAYS_MS } from "./queue-delivery";
import {
  isUnauthorized,
  type MessageFlushResult,
} from "./station-message-delivery";
import {
  onStationMessagesChanged,
  stationMessageDelivery,
} from "./station-message-store";

// The one automatic retry loop for queued station messages (MET-A-029, #445).
// Flushes when enabled (online and in the foreground), when the socket
// reconnects, and after a growing backoff whenever a flush stops early. A 401
// asks for session renewal instead of retrying with the rejected token.
export function useStationMessageRetry({
  token,
  enabled,
  onUnauthorized,
}: {
  token: string;
  enabled: boolean;
  onUnauthorized: () => void;
}): void {
  const userId = userIdFromToken(token);
  const onUnauthorizedRef = useRef(onUnauthorized);
  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    if (!enabled || userId === null) return;

    let cancelled = false;
    let attempts = 0;
    let unauthorizedNotified = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const flushNow = () => {
      if (cancelled || unauthorizedNotified) return;
      clearTimer();
      void stationMessageDelivery.flush(userId, token).catch(() => undefined);
    };

    const onResult = (result: MessageFlushResult | null) => {
      if (cancelled || result === null) return;
      if (isUnauthorized(result)) {
        clearTimer();
        attempts = 0;
        if (!unauthorizedNotified) {
          unauthorizedNotified = true;
          onUnauthorizedRef.current();
        }
        return;
      }
      if (result.blocked) {
        attempts += 1;
        const delay =
          RETRY_DELAYS_MS[Math.min(attempts, RETRY_DELAYS_MS.length) - 1];
        clearTimer();
        timer = setTimeout(() => {
          timer = null;
          flushNow();
        }, delay);
      } else {
        attempts = 0;
        clearTimer();
      }
    };

    const unsubscribe = onStationMessagesChanged(onResult);
    socket.on("connect", flushNow);
    flushNow();

    return () => {
      cancelled = true;
      clearTimer();
      socket.off("connect", flushNow);
      unsubscribe();
    };
  }, [userId, token, enabled]);
}
