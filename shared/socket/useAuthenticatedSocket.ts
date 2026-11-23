import { useEffect } from "react";
import type { AppSocket } from "./createSocket";
import { ERROR_CODES } from "../error-codes";
import type { Session } from "../auth/session";

const INITIAL_RETRY_MS = 5_000;
const MAX_RETRY_MS = 30_000;
const STABLE_CONNECTION_MS = 30_000;

function connectWithToken(socket: AppSocket, token: string) {
  socket.auth = { token };
  socket.connect();
}

export function useAuthenticatedSocket(
  socket: AppSocket,
  token: string | undefined,
  restoreSession: (retryAfterInFlight?: boolean) => Promise<Session | null>,
) {
  useEffect(() => {
    if (token === undefined) return;

    let active = true;
    let retryDelay = INITIAL_RETRY_MS;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let stableTimer: ReturnType<typeof setTimeout> | undefined;
    let checking = false;
    let reconnectRequested = false;
    let retriedAuthentication = false;
    let serverDisconnects = 0;

    function checkSession(reconnectAfterCheck: boolean) {
      reconnectRequested ||= reconnectAfterCheck;
      if (!active || checking) return;
      checking = true;
      void restoreSession(true)
        .catch(() => null)
        .then((session) => {
          if (!active) return;
          if (session) {
            if (
              reconnectRequested &&
              !retriedAuthentication &&
              session.token === token
            ) {
              retriedAuthentication = true;
              socket.connect();
            }
            reconnectRequested = false;
            return;
          }

          // Socket authentication rejection stops Socket.IO's automatic retry.
          // Also retry /me if the socket connected while the API was unavailable.
          retryTimer = setTimeout(() => {
            retryTimer = undefined;
            checkSession(reconnectRequested);
          }, retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
        })
        .finally(() => {
          checking = false;
        });
    }

    function onConnect() {
      retriedAuthentication = false;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = undefined;
      if (stableTimer) clearTimeout(stableTimer);
      stableTimer = setTimeout(() => {
        serverDisconnects = 0;
        retryDelay = INITIAL_RETRY_MS;
      }, STABLE_CONNECTION_MS);
      checkSession(false);
    }

    function onConnectError(error: Error) {
      if (
        error.message !== ERROR_CODES.AUTH_TOKEN_INVALID &&
        error.message !== ERROR_CODES.SERVICE_UNAVAILABLE
      )
        return;
      if (retriedAuthentication) {
        if (!retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = undefined;
            retriedAuthentication = false;
            checkSession(true);
          }, retryDelay);
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
        }
        return;
      }
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = undefined;
      checkSession(true);
    }

    function onDisconnect(reason: string) {
      if (stableTimer) clearTimeout(stableTimer);
      stableTimer = undefined;
      if (reason !== "io server disconnect") return;
      serverDisconnects += 1;
      if (serverDisconnects === 1) {
        checkSession(true);
      } else if (!retryTimer) {
        retryTimer = setTimeout(() => {
          retryTimer = undefined;
          checkSession(true);
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
      }
    }

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    connectWithToken(socket, token);

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (stableTimer) clearTimeout(stableTimer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, [socket, token, restoreSession]);
}
