import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineQueue } from "../../shared/session/offline-queue.js";
import {
  isSessionExpired,
  SESSION_EXPIRED_MESSAGE,
} from "../../shared/session/session.js";

const NOW = Date.parse("2026-10-04T10:00:00Z");

// Unsigned token with the given exp; the client never verifies signatures.
function tokenFor(userId, expSecondsFromNow) {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Math.floor(NOW / 1000) + expSecondsFromNow }),
  ).toString("base64url");
  return `header.${payload}.signature`;
}

// Storage returns fresh copies, like localStorage/AsyncStorage would.
function memoryStorage() {
  let saved = "[]";
  return {
    load: () => JSON.parse(saved),
    save: (entries) => {
      saved = JSON.stringify(entries);
    },
  };
}

function setup(respond = () => ({ status: 202 }), now = () => NOW) {
  const calls = [];
  const queue = createOfflineQueue({
    storage: memoryStorage(),
    send: async (report, token) => {
      calls.push({ report, token });
      return respond(report, calls.length);
    },
    now,
  });
  return { queue, calls };
}

const report = (station) => ({
  staff: "steward-test",
  station,
  reportedAt: "2026-10-04T09:00:00Z",
});

test("AC2: an expired session sends nothing and keeps every queued report", async () => {
  const { queue, calls } = setup();
  queue.enqueue("steward-test", report("Station A"));
  queue.enqueue("steward-test", report("Station B"));

  const result = await queue.flush({
    userId: "steward-test",
    token: tokenFor("steward-test", -60),
  });

  assert.deepEqual(result, { sent: 0, sessionExpired: true });
  assert.equal(calls.length, 0);
  assert.equal(queue.pending("steward-test").length, 2);
});

test("AC2: a session that expires mid-flush keeps the unsent reports", async () => {
  // The token is valid for the first send and has expired by the second,
  // when the server answers 401.
  let clock = NOW;
  const { queue } = setup(
    (_, call) => {
      if (call === 1) {
        clock = NOW + 2 * 3600 * 1000;
        return { status: 202 };
      }
      return { status: 401 };
    },
    () => clock,
  );
  queue.enqueue("steward-test", report("Station A"));
  queue.enqueue("steward-test", report("Station B"));
  queue.enqueue("steward-test", report("Station C"));

  const result = await queue.flush({
    userId: "steward-test",
    token: tokenFor("steward-test", 3600),
  });

  assert.deepEqual(result, { sent: 1, sessionExpired: true });
  assert.deepEqual(
    queue.pending("steward-test").map((e) => e.report.station),
    ["Station B", "Station C"],
  );
});

test("AC4: a 401 for a token that has not expired is not reported as an expired session", async () => {
  const { queue } = setup(() => ({ status: 401 }));
  queue.enqueue("steward-test", report("Station A"));

  const result = await queue.flush({
    userId: "steward-test",
    token: tokenFor("steward-test", 3600),
  });

  assert.deepEqual(result, { sent: 0, sessionExpired: false });
  assert.equal(queue.pending("steward-test").length, 1);
});

test("AC2: any other failure keeps the report too", async () => {
  const { queue } = setup(() => ({ status: 503 }));
  queue.enqueue("steward-test", report("Station A"));

  const result = await queue.flush({
    userId: "steward-test",
    token: tokenFor("steward-test", 3600),
  });

  assert.deepEqual(result, { sent: 0, sessionExpired: false });
  assert.equal(queue.pending("steward-test").length, 1);
});

test("AC3: after signing in again, queued reports sync under the user who made them", async () => {
  const { queue, calls } = setup();
  queue.enqueue("steward-a", report("Station A"));
  queue.enqueue("steward-b", report("Station B"));
  queue.enqueue("steward-a", report("Station C"));

  // Session expired while offline: nothing goes out.
  await queue.flush({ userId: "steward-a", token: tokenFor("steward-a", -1) });
  assert.equal(calls.length, 0);

  // steward-a signs in again.
  const freshToken = tokenFor("steward-a", 7200);
  const result = await queue.flush({ userId: "steward-a", token: freshToken });

  assert.deepEqual(result, { sent: 2, sessionExpired: false });
  assert.deepEqual(
    calls.map((c) => c.report.station),
    ["Station A", "Station C"],
  );
  assert.ok(calls.every((c) => c.token === freshToken));
  assert.equal(queue.pending("steward-a").length, 0);
  assert.equal(queue.pending("steward-b").length, 1);
});

test("AC2: two identical reports are both sent, not collapsed into one", async () => {
  const { queue, calls } = setup();
  queue.enqueue("steward-test", report("Station A"));
  queue.enqueue("steward-test", report("Station A"));

  await queue.flush({
    userId: "steward-test",
    token: tokenFor("steward-test", 3600),
  });

  assert.equal(calls.length, 2);
  assert.equal(queue.pending("steward-test").length, 0);
});

test("AC4: isSessionExpired reads exp, and the message tells the user reports are kept", () => {
  assert.equal(isSessionExpired(tokenFor("u", -1), NOW), true);
  assert.equal(isSessionExpired(tokenFor("u", 0), NOW), true);
  assert.equal(isSessionExpired(tokenFor("u", 60), NOW), false);
  assert.equal(isSessionExpired("not-a-jwt", NOW), true);
  assert.match(SESSION_EXPIRED_MESSAGE, /expired/i);
  assert.match(SESSION_EXPIRED_MESSAGE, /kept/i);
});
