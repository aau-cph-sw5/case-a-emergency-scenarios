import { useCallback, useEffect, useRef, useState } from "react";
import { isRoleAllowedForClient, type Client } from "./client-access";
import {
  getCurrentUser,
  isRenewalDue,
  renewSession,
  logout as revokeSession,
  type RenewalResult,
  type Session,
} from "./session";

export type SessionStore = {
  load(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
};

export type SessionState =
  | { status: "restoring" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: Session }
  | { status: "unavailable"; session: Session };

type UseSessionOptions = {
  apiBaseUrl: string;
  client: Client;
  store: SessionStore;
};

export function useSession({ apiBaseUrl, client, store }: UseSessionOptions) {
  const [state, setState] = useState<SessionState>({
    status: "restoring",
  });
  const [logoutStorageError, setLogoutStorageError] = useState(false);

  const restoreInFlightRef = useRef<Promise<Session | null> | null>(null);
  const logoutCleanupRef = useRef<Promise<void> | null>(null);
  const sessionGenerationRef = useRef(0);
  const signingOutRef = useRef(false);
  const logoutStorageErrorRef = useRef(false);
  const logoutRetryTokenRef = useRef<string | null>(null);
  const currentSessionRef = useRef<Session | null>(null);
  const sessionNeedsSavingRef = useRef(false);
  const logoutRenewalRef = useRef<{
    generation: number;
    token?: string;
  } | null>(null);

  const restore: (retryAfterInFlight?: boolean) => Promise<Session | null> =
    useCallback(
      async function restoreSession(
        retryAfterInFlight = false,
      ): Promise<Session | null> {
        if (signingOutRef.current || logoutStorageErrorRef.current) return null;
        const generation = sessionGenerationRef.current;
        const isCurrent = () => sessionGenerationRef.current === generation;
        const inFlight = restoreInFlightRef.current;

        if (inFlight) {
          const result = await inFlight;
          if (!isCurrent()) return null;
          if (retryAfterInFlight) {
            if (restoreInFlightRef.current === inFlight) {
              restoreInFlightRef.current = null;
            }
            return restoreSession();
          }
          return result;
        }

        const operation = (async () => {
          let storedSession: Session | null;

          try {
            storedSession = currentSessionRef.current ?? (await store.load());
          } catch {
            if (isCurrent()) setState({ status: "signed-out" });
            return null;
          }

          if (!isCurrent()) return null;
          if (!storedSession) {
            setState({ status: "signed-out" });
            return null;
          }
          currentSessionRef.current = storedSession;

          let currentUser;

          try {
            currentUser = await getCurrentUser(apiBaseUrl, storedSession.token);
          } catch {
            // Keep the locally stored token while the API is unreachable.
            if (isCurrent())
              setState({ status: "unavailable", session: storedSession });
            return null;
          }

          if (!isCurrent()) return null;
          if (
            !currentUser ||
            !isRoleAllowedForClient(client, currentUser.role)
          ) {
            currentSessionRef.current = null;
            try {
              await store.clear();
            } catch {
              // The token is rejected locally.
            }

            if (isCurrent()) setState({ status: "signed-out" });
            return null;
          }

          let session: Session = {
            ...storedSession,
            role: currentUser.role,
          };

          if (sessionNeedsSavingRef.current) {
            try {
              await store.save(session);
              if (isCurrent()) sessionNeedsSavingRef.current = false;
            } catch {
              // Keep using the current token and retry persistence later.
            }
            if (!isCurrent()) return null;
          }

          if (isRenewalDue(session)) {
            let renewal: RenewalResult;

            try {
              renewal = await renewSession(apiBaseUrl, session.token);
            } catch {
              // /me accepted this token. A renewal failure is temporary, so retain
              // it and retry when the app next restores its session.
              if (!isCurrent()) return null;
              setState({ status: "signed-in", session });
              return session;
            }

            if (!isCurrent()) {
              const pendingLogout = logoutRenewalRef.current;
              if (
                renewal.kind === "renewed" &&
                pendingLogout?.generation === generation
              ) {
                pendingLogout.token = renewal.session.token;
              }
              return null;
            }
            if (
              renewal.kind === "invalid" ||
              (renewal.kind === "renewed" &&
                !isRoleAllowedForClient(client, renewal.session.role))
            ) {
              currentSessionRef.current = null;
              try {
                await store.clear();
              } catch {
                // The token is still rejected locally.
              }

              if (isCurrent()) setState({ status: "signed-out" });
              return null;
            }

            if (renewal.kind === "renewed") {
              session = renewal.session;
              currentSessionRef.current = session;

              try {
                await store.save(session);
                if (isCurrent()) sessionNeedsSavingRef.current = false;
              } catch {
                if (!isCurrent()) return null;
                sessionNeedsSavingRef.current = true;
                setState({ status: "signed-in", session });
                return session;
              }
            }
          }

          if (!isCurrent()) return null;
          currentSessionRef.current = session;
          setState({ status: "signed-in", session });
          return session;
        })();

        restoreInFlightRef.current = operation;

        try {
          return await operation;
        } finally {
          if (restoreInFlightRef.current === operation) {
            restoreInFlightRef.current = null;
          }
        }
      },
      [client, apiBaseUrl, store],
    );

  useEffect(() => {
    void Promise.resolve().then(() => restore());
  }, [restore]);

  const completeLogin = useCallback(
    async (session: Session) => {
      if (!isRoleAllowedForClient(client, session.role)) {
        throw new Error("The signed-in account has the wrong role.");
      }

      const generation = ++sessionGenerationRef.current;
      await logoutCleanupRef.current;
      if (sessionGenerationRef.current !== generation) return;
      if (logoutStorageErrorRef.current) {
        throw new Error("The previous session could not be removed.");
      }
      await store.save(session);
      if (sessionGenerationRef.current === generation) {
        currentSessionRef.current = session;
        sessionNeedsSavingRef.current = false;
        setState({ status: "signed-in", session });
      }
    },
    [client, store],
  );

  const signOut = useCallback(async () => {
    if (state.status !== "signed-in" && state.status !== "unavailable") {
      return;
    }

    if (signingOutRef.current) return;
    signingOutRef.current = true;
    const logoutRenewal = {
      generation: sessionGenerationRef.current,
      token: undefined as string | undefined,
    };
    logoutRenewalRef.current = logoutRenewal;
    sessionGenerationRef.current += 1;
    const inFlight = restoreInFlightRef.current;
    const token = currentSessionRef.current?.token ?? state.session.token;
    logoutRetryTokenRef.current = token;
    currentSessionRef.current = null;
    sessionNeedsSavingRef.current = false;
    setState({ status: "signed-out" });

    const revoke = revokeSession(apiBaseUrl, token).catch(() => {
      // Local logout must still work while offline.
    });
    const cleanup = (async () => {
      let storageFailed = false;
      try {
        await store.clear();
      } catch {
        storageFailed = true;
      }

      if (inFlight) {
        await inFlight;
        try {
          await store.clear();
          storageFailed = false;
        } catch {
          storageFailed = true;
        }
        if (logoutRenewal.token && logoutRenewal.token !== token) {
          logoutRetryTokenRef.current = logoutRenewal.token;
          await revokeSession(apiBaseUrl, logoutRenewal.token).catch(() => {
            // A failed network request cannot prevent local logout.
          });
        }
      }
      logoutStorageErrorRef.current = storageFailed;
      if (!storageFailed) logoutRetryTokenRef.current = null;
    })();
    logoutCleanupRef.current = cleanup;

    try {
      await cleanup;
    } finally {
      if (logoutCleanupRef.current === cleanup) {
        logoutCleanupRef.current = null;
        logoutRenewalRef.current = null;
        signingOutRef.current = false;
      }
    }

    setLogoutStorageError(logoutStorageErrorRef.current);

    await revoke;
  }, [apiBaseUrl, state, store]);

  const retryLogout = useCallback(async () => {
    if (signingOutRef.current || !logoutStorageErrorRef.current) return;
    signingOutRef.current = true;
    const token = logoutRetryTokenRef.current;
    if (token) void revokeSession(apiBaseUrl, token).catch(() => {});
    try {
      await store.clear();
      logoutStorageErrorRef.current = false;
      logoutRetryTokenRef.current = null;
      setLogoutStorageError(false);
    } catch {
      // Keep the warning and allow another attempt.
    } finally {
      signingOutRef.current = false;
    }
  }, [apiBaseUrl, store]);

  return {
    state,
    completeLogin,
    restore,
    signOut,
    logoutStorageError,
    retryLogout,
  };
}
