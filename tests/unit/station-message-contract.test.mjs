import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../../src/validation/contract-validator.ts";

// The station messages agreed for MET-A-029 (#332).
const request = {
  clientMessageId: "6f1c2f0e-4a53-4a0e-9d0b-2f8c7c1f5b11",
  activationId: 1,
  text: "Elevatoren er ude af drift.",
  writtenAt: "2026-11-11T12:00:00Z",
};
const message = {
  ...request,
  id: 1,
  station: "Station B",
  sender: "STATION",
  receivedAt: "2026-11-11T12:00:02Z",
};
const thread = {
  activationId: 1,
  station: "Station B",
  state: "UNANSWERED",
  unansweredSince: "2026-11-11T12:00:02Z",
  lastMessageAt: "2026-11-11T12:00:02Z",
};
const checkRequest = (body) =>
  validate(body, "station-message-request.schema.json");
const checkMessage = (body) => validate(body, "station-message.schema.json");
const checkThread = (body) => validate(body, "station-thread.schema.json");

test("accepts a message request", () => {
  assert.deepEqual(checkRequest(request), []);
});

test("rejects a request without one of its fields", () => {
  for (const field of Object.keys(request)) {
    const rest = { ...request };
    delete rest[field];
    assert.notDeepEqual(checkRequest(rest), [], field);
  }
});

test("rejects empty, whitespace-only and too long text", () => {
  assert.notDeepEqual(checkRequest({ ...request, text: "" }), []);
  assert.notDeepEqual(checkRequest({ ...request, text: " \n\t " }), []);
  assert.notDeepEqual(checkRequest({ ...request, text: "a".repeat(1001) }), []);
});

test("counts the text length in code points, not UTF-16 units", () => {
  // Each emoji is one code point but two UTF-16 units.
  assert.deepEqual(checkRequest({ ...request, text: "🚇".repeat(1000) }), []);
  assert.notDeepEqual(
    checkRequest({ ...request, text: "🚇".repeat(1001) }),
    [],
  );
});

test("rejects a clientMessageId that is not a UUID", () => {
  assert.notDeepEqual(
    checkRequest({ ...request, clientMessageId: "message-1" }),
    [],
  );
});

test("a request cannot choose its sender or station", () => {
  assert.notDeepEqual(checkRequest({ ...request, sender: "CONTROL_ROOM" }), []);
  assert.notDeepEqual(checkRequest({ ...request, station: "Station A" }), []);
});

test("accepts a message from the station and from the control room", () => {
  for (const sender of ["STATION", "CONTROL_ROOM"]) {
    assert.deepEqual(checkMessage({ ...message, sender }), [], sender);
  }
  assert.notDeepEqual(checkMessage({ ...message, sender: "STEWARD" }), []);
});

test("a message cannot carry the steward's identity", () => {
  for (const field of ["staff", "userId", "username"]) {
    assert.notDeepEqual(checkMessage({ ...message, [field]: "7" }), [], field);
  }
});

test("accepts a thread with and without its messages", () => {
  assert.deepEqual(checkThread(thread), []);
  assert.deepEqual(checkThread({ ...thread, messages: [message] }), []);
});

test("accepts an answered thread and an empty thread", () => {
  assert.deepEqual(
    checkThread({ ...thread, state: "ANSWERED", unansweredSince: null }),
    [],
  );
  assert.deepEqual(
    checkThread({
      ...thread,
      state: "ANSWERED",
      unansweredSince: null,
      lastMessageAt: null,
      messages: [],
    }),
    [],
  );
});

test("rejects a state that disagrees with unansweredSince", () => {
  assert.notDeepEqual(checkThread({ ...thread, unansweredSince: null }), []);
  assert.notDeepEqual(checkThread({ ...thread, state: "ANSWERED" }), []);
});

test("a thread cannot carry the steward's identity", () => {
  for (const field of ["staff", "userId", "username"]) {
    assert.notDeepEqual(checkThread({ ...thread, [field]: "7" }), [], field);
  }
});

test("rejects a thread state that is not agreed", () => {
  assert.notDeepEqual(checkThread({ ...thread, state: "CLOSED" }), []);
});

test("rejects a thread whose message carries the steward's identity", () => {
  assert.notDeepEqual(
    checkThread({ ...thread, messages: [{ ...message, staff: "7" }] }),
    [],
  );
});
