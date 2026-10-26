import { isRole } from "../../../shared/auth/roles";
import type { Session } from "../../../shared/auth/session";
import type { SessionStore } from "../../../shared/auth/use-session";

const SESSION_STORAGE_KEY = "metro-session";

function isSession(value: unknown): value is Session {
  if (typeof value !== "object" || value === null) return false;

  const { token, role } = value as Record<string, unknown>;

  return typeof token === "string" && token !== "" && isRole(role);
}

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
