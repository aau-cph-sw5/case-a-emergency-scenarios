import * as SecureStore from "expo-secure-store";
import { isSession } from "../../../shared/auth/session";
import type { SessionStore } from "../../../shared/auth/use-session";

const SESSION_STORAGE_KEY = "metro-scenario-session";

export const mobileSessionStore: SessionStore = {
  async load() {
    const rawSession = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

    if (!rawSession) return null;

    try {
      const parsedSession: unknown = JSON.parse(rawSession);

      if (isSession(parsedSession)) return parsedSession;
    } catch {
      // Invalid stored data is treated as no session.
    }

    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    return null;
  },

  async save(session) {
    await SecureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
    );
  },

  async clear() {
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  },
};
