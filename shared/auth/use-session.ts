import { useCallback, useEffect, useState } from "react";
import type { Role } from "./roles";
import {
  getCurrentUser,
  logout as revokeSession,
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

  const restore = useCallback(async () => {
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

    try {
      const currentUser = await getCurrentUser(apiBaseUrl, storedSession.token);

      if (!currentUser || currentUser.role !== allowedRole) {
        await store.clear();
        setState({ status: "signed-out" });
        return;
      }

      setState({
        status: "signed-in",
        session: {
          token: storedSession.token,
          role: currentUser.role,
        },
      });
    } catch {
      // Do not discard a possibly valid token merely because the API is offline.
      setState({ status: "unavailable", session: storedSession });
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
