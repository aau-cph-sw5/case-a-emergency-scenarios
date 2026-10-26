import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentUser,
  isRenewalDue,
  logout,
  renewSession,
} from "../../shared/auth/session.ts";

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

test("renewSession returns a replacement session", async () => {
  const { fetchImpl, calls } = mockFetch(200, {
    token: "renewed-token",
    role: "STEWARD",
    expiresAt: "2026-11-20T12:00:00.000Z",
  });

  const result = await renewSession(API, TOKEN, fetchImpl);

  assert.deepEqual(result, {
    kind: "renewed",
    session: {
      token: "renewed-token",
      role: "STEWARD",
      expiresAt: "2026-11-20T12:00:00.000Z",
    },
  });
  assert.equal(calls[0].url, `${API}/api/v1/auth/renew`);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
});

test("renewSession distinguishes a session that is not due from an invalid one", async () => {
  assert.deepEqual(await renewSession(API, TOKEN, mockFetch(204).fetchImpl), {
    kind: "not-due",
  });
  assert.deepEqual(await renewSession(API, TOKEN, mockFetch(401).fetchImpl), {
    kind: "invalid",
  });
});

test("renewSession rejects malformed successful responses", async () => {
  await assert.rejects(
    renewSession(
      API,
      TOKEN,
      mockFetch(200, { token: "missing-fields" }).fetchImpl,
    ),
    /unexpected renewal response/,
  );
});

test("isRenewalDue is true only during the final seven days", () => {
  const now = Date.parse("2026-10-21T12:00:00.000Z");
  const session = (expiresAt) => ({
    token: TOKEN,
    role: "STEWARD",
    expiresAt,
  });

  assert.equal(isRenewalDue(session("2026-10-28T12:00:00.000Z"), now), true);
  assert.equal(isRenewalDue(session("2026-10-29T12:00:00.000Z"), now), false);
  assert.equal(isRenewalDue(session("2026-10-20T12:00:00.000Z"), now), false);
});

test("logout accepts successful and already-invalid sessions", async () => {
  await logout(API, TOKEN, mockFetch(204).fetchImpl);
  await logout(API, TOKEN, mockFetch(401).fetchImpl);
});

test("logout rejects unexpected server failures", async () => {
  await assert.rejects(logout(API, TOKEN, mockFetch(500).fetchImpl), /500/);
});
