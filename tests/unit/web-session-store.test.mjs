import assert from "node:assert/strict";
import test from "node:test";
import { webSessionStore } from "../../web/src/auth/session-store.ts";

function createSessionStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

async function withSessionStorage(callback) {
  const originalWindow = globalThis.window;
  const sessionStorage = createSessionStorage();
  globalThis.window = { sessionStorage };

  try {
    await callback(sessionStorage);
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
}

test("webSessionStore saves, loads, and clears a session", async () => {
  await withSessionStorage(async () => {
    const session = {
      token: "token",
      role: "OPERATOR",
      expiresAt: "2026-11-20T12:00:00.000Z",
    };

    await webSessionStore.save(session);
    assert.deepEqual(await webSessionStore.load(), session);

    await webSessionStore.clear();
    assert.equal(await webSessionStore.load(), null);
  });
});

test("webSessionStore removes malformed stored data", async () => {
  await withSessionStorage(async (sessionStorage) => {
    sessionStorage.setItem("metro-session", "not-json");

    assert.equal(await webSessionStore.load(), null);
    assert.equal(sessionStorage.getItem("metro-session"), null);
  });
});
