import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentUser, logout } from "../../shared/auth/session.ts";

const API = "http://localhost:4010";
const TOKEN = "test-token";

function mockFetch(status, body = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    };
  };
  return { fetchImpl, calls };
}

test("getCurrentUser returns a validated current user", async () => {
  const { fetchImpl, calls } = mockFetch(200, {
    userId: 42,
    role: "STEWARD",
  });

  const user = await getCurrentUser(API, TOKEN, fetchImpl);

  assert.deepEqual(user, { userId: 42, role: "STEWARD" });
  assert.equal(calls[0].url, `${API}/api/v1/me`);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
});

test("getCurrentUser returns null for an invalid session", async () => {
  const { fetchImpl } = mockFetch(401);

  assert.equal(await getCurrentUser(API, TOKEN, fetchImpl), null);
});

test("getCurrentUser rejects malformed successful responses", async () => {
  const { fetchImpl } = mockFetch(200, { userId: "42", role: "ADMIN" });

  await assert.rejects(
    getCurrentUser(API, TOKEN, fetchImpl),
    /unexpected current-user response/,
  );
});

test("logout accepts successful and already-invalid sessions", async () => {
  await logout(API, TOKEN, mockFetch(204).fetchImpl);
  await logout(API, TOKEN, mockFetch(401).fetchImpl);
});

test("logout rejects unexpected server failures", async () => {
  await assert.rejects(logout(API, TOKEN, mockFetch(500).fetchImpl), /500/);
});
