import { useCallback, useEffect, useRef, useState } from "react";
import type { Role } from "./roles";
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
  allowedRole: Role;
  store: SessionStore;
};

export function useSession({
  apiBaseUrl,
  allowedRole,
  store,
}: UseSessionOptions) {
  const [state, setState] = useState<SessionState>({
    status: "restoring",
  });

  const restoreInFlightRef = useRef<Promise<void> | null>(null);

  const restore = useCallback(async (): Promise<void> => {
    const inFlight = restoreInFlightRef.current;

    if (inFlight) return inFlight;

    const operation = (async () => {
      let storedSession: Session | null;

      try {
        storedSession = await store.load();
      } catch {
        setState({ status: "signed-out" });
        return;
      }

      if (!storedSession) {
        setState({ status: "signed-out" });
        return;
      }

      let currentUser;

      try {
        currentUser = await getCurrentUser(apiBaseUrl, storedSession.token);
      } catch {
        // Keep the locally stored token while the API is unreachable.
        setState({ status: "unavailable", session: storedSession });
        return;
      }

      if (!currentUser || currentUser.role !== allowedRole) {
        try {
          await store.clear();
        } catch {
          // The token is rejected locally.
        }

        setState({ status: "signed-out" });
        return;
      }

      let session: Session = {
        ...storedSession,
        role: currentUser.role,
      };

      if (isRenewalDue(session)) {
        let renewal: RenewalResult;

        try {
          renewal = await renewSession(apiBaseUrl, session.token);
        } catch {
          // /me accepted this token. A renewal failure is temporary, so retain
          // it and retry when the app next restores its session.
          setState({ status: "signed-in", session });
          return;
        }

        if (
          renewal.kind === "invalid" ||
          (renewal.kind === "renewed" && renewal.session.role !== allowedRole)
        ) {
          try {
            await store.clear();
          } catch {
            // The token is still rejected locally.
          }

          setState({ status: "signed-out" });
          return;
        }

        if (renewal.kind === "renewed") {
          session = renewal.session;

          try {
            await store.save(session);
          } catch {
            setState({ status: "signed-in", session });
            return;
          }
        }
      }

      setState({ status: "signed-in", session });
    })();

    restoreInFlightRef.current = operation;

    try {
      await operation;
    } finally {
      restoreInFlightRef.current = null;
    }
  }, [allowedRole, apiBaseUrl, store]);

  useEffect(() => {
    void Promise.resolve().then(restore);
  }, [restore]);

  const completeLogin = useCallback(
    async (session: Session) => {
      if (session.role !== allowedRole) {
        throw new Error("The signed-in account has the wrong role.");
      }

      await store.save(session);
      setState({ status: "signed-in", session });
    },
    [allowedRole, store],
  );

  const signOut = useCallback(async () => {
    if (state.status !== "signed-in" && state.status !== "unavailable") {
      return;
    }

    try {
      await revokeSession(apiBaseUrl, state.session.token);
    } catch {
      // Local logout must still work while offline.
    }

    try {
      await store.clear();
    } catch {
      // The server-side session was still revoked if the request succeeded.
    }

    setState({ status: "signed-out" });
  }, [apiBaseUrl, state, store]);

  return {
    state,
    completeLogin,
    restore,
    signOut,
  };
}
