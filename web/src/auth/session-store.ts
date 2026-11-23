import { isSession } from "../../../shared/auth/session";
import type { SessionStore } from "../../../shared/auth/use-session";

const SESSION_STORAGE_KEY = "metro-session";

export const webSessionStore: SessionStore = {
  async load() {
    const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) return null;

    try {
      const parsedSession: unknown = JSON.parse(rawSession);

      if (isSession(parsedSession)) return parsedSession;
    } catch {
      // Invalid stored data is treated as no session.
    }

    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  },

  async save(session) {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  },

  async clear() {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },
};
