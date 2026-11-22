import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../../src/validation/contract-validator.ts";
import {
  isStationMessage,
  isStationMessageEvent,
  isStationMessageRequest,
  isStationThread,
  isStationThreadWithMessages,
  isStationThreadsClosed,
} from "../../shared/station-messages/validate.ts";

const validRequest = {
  clientMessageId: "6f1c2f0e-4a53-4a0e-9d0b-2f8c7c1f5b11",
  activationId: 1,
  text: "Elevatoren er ude af drift.",
  writtenAt: "2026-11-11T12:00:00Z",
};

const validMessage = {
  ...validRequest,
  id: 1,
  station: "Station B",
  sender: "STATION",
  receivedAt: "2026-11-11T12:00:02Z",
};

const validThread = {
  activationId: 1,
  station: "Station B",
  state: "UNANSWERED",
  unansweredSince: "2026-11-11T12:00:02Z",
  lastMessageAt: "2026-11-11T12:00:02Z",
};

function assertMatchesAjv(schemaId, guard, cases) {
  for (const [label, candidate] of cases) {
    const ajvValid = validate(candidate, schemaId).length === 0;
    const sharedValid = guard(candidate);
    assert.equal(
      sharedValid,
      ajvValid,
      `${schemaId} mismatch for "${label}": shared=${sharedValid}, ajv=${ajvValid}`,
    );
  }
}

test("isStationMessageRequest matches Ajv across valid and invalid payloads", () => {
  assertMatchesAjv(
    "station-message-request.schema.json",
    isStationMessageRequest,
    [
      ["valid request", validRequest],
      [
        "uppercase UUID",
        {
          ...validRequest,
          clientMessageId: validRequest.clientMessageId.toUpperCase(),
        },
      ],
      [
        "fractional seconds and offset",
        { ...validRequest, writtenAt: "2024-02-29T23:59:59.123+02:00" },
      ],
      [
        "lowercase t and z",
        { ...validRequest, writtenAt: "2026-11-11t12:00:00z" },
      ],
      [
        "leap second in UTC",
        { ...validRequest, writtenAt: "2016-12-31T23:59:60Z" },
      ],
      ["1000 emoji code points", { ...validRequest, text: "🚇".repeat(1000) }],
      ["1001 emoji code points", { ...validRequest, text: "🚇".repeat(1001) }],
      ["1001 ascii characters", { ...validRequest, text: "a".repeat(1001) }],
      ["empty text", { ...validRequest, text: "" }],
      ["whitespace only text", { ...validRequest, text: " \n\t " }],
      ["non-string text", { ...validRequest, text: 42 }],
      [
        "non-UUID clientMessageId",
        { ...validRequest, clientMessageId: "message-1" },
      ],
      [
        "missing clientMessageId",
        { activationId: 1, text: "Hej", writtenAt: validRequest.writtenAt },
      ],
      ["activationId zero", { ...validRequest, activationId: 0 }],
      ["activationId negative", { ...validRequest, activationId: -3 }],
      ["activationId float", { ...validRequest, activationId: 1.5 }],
      ["activationId string", { ...validRequest, activationId: "1" }],
      [
        "writtenAt missing timezone",
        { ...validRequest, writtenAt: "2026-11-11T12:00:00" },
      ],
      [
        "writtenAt invalid leap day",
        { ...validRequest, writtenAt: "2026-02-29T12:00:00Z" },
      ],
      [
        "writtenAt invalid month",
        { ...validRequest, writtenAt: "2026-13-01T12:00:00Z" },
      ],
      [
        "writtenAt invalid hour",
        { ...validRequest, writtenAt: "2026-11-11T24:00:00Z" },
      ],
      [
        "writtenAt invalid leap second",
        { ...validRequest, writtenAt: "2026-11-11T12:00:60Z" },
      ],
      [
        "writtenAt invalid tz offset",
        { ...validRequest, writtenAt: "2026-11-11T12:00:00+25:00" },
      ],
      ["writtenAt not a date", { ...validRequest, writtenAt: "not-a-date" }],
      ["extra sender field", { ...validRequest, sender: "STATION" }],
      ["extra staff field", { ...validRequest, staff: "7" }],
      ["null", null],
      ["array", [validRequest]],
      ["primitive", "text"],
    ],
  );
});

test("isStationMessage matches Ajv across valid and invalid payloads", () => {
  assertMatchesAjv("station-message.schema.json", isStationMessage, [
    ["valid station message", validMessage],
    ["valid control room message", { ...validMessage, sender: "CONTROL_ROOM" }],
    ["1000 emoji code points", { ...validMessage, text: "🚇".repeat(1000) }],
    ["1001 emoji code points", { ...validMessage, text: "🚇".repeat(1001) }],
    ["empty text", { ...validMessage, text: "" }],
    ["invalid sender", { ...validMessage, sender: "STEWARD" }],
    ["id zero", { ...validMessage, id: 0 }],
    ["id float", { ...validMessage, id: 1.2 }],
    ["activationId zero", { ...validMessage, activationId: 0 }],
    [
      "non-UUID clientMessageId",
      { ...validMessage, clientMessageId: "client-1" },
    ],
    [
      "writtenAt without tz",
      { ...validMessage, writtenAt: "2026-11-11T12:00:00" },
    ],
    [
      "receivedAt without tz",
      { ...validMessage, receivedAt: "2026-11-11T12:00:02" },
    ],
    ["non-string station", { ...validMessage, station: 123 }],
    ["leaked staff field", { ...validMessage, staff: "7" }],
    ["leaked userId field", { ...validMessage, userId: 7 }],
    ["leaked username field", { ...validMessage, username: "steward" }],
    [
      "missing receivedAt",
      { ...validRequest, id: 1, station: "Station B", sender: "STATION" },
    ],
    ["null", null],
    ["array", []],
  ]);
});

test("isStationThread matches Ajv across valid and invalid payloads", () => {
  assertMatchesAjv("station-thread.schema.json", isStationThread, [
    ["valid unanswered thread summary", validThread],
    [
      "valid answered thread",
      { ...validThread, state: "ANSWERED", unansweredSince: null },
    ],
    [
      "valid empty thread",
      {
        ...validThread,
        state: "ANSWERED",
        unansweredSince: null,
        lastMessageAt: null,
        stationMessageIds: [],
        messages: [],
      },
    ],
    [
      "valid with stationMessageIds",
      { ...validThread, stationMessageIds: [1, 2, 3] },
    ],
    ["valid with messages", { ...validThread, messages: [validMessage] }],
    [
      "UNANSWERED with null unansweredSince",
      { ...validThread, unansweredSince: null },
    ],
    [
      "ANSWERED with string unansweredSince",
      { ...validThread, state: "ANSWERED" },
    ],
    ["invalid state CLOSED", { ...validThread, state: "CLOSED" }],
    [
      "invalid lastMessageAt",
      { ...validThread, lastMessageAt: "2026-11-11T12:00:02" },
    ],
    ["invalid unansweredSince", { ...validThread, unansweredSince: "bad" }],
    [
      "duplicate stationMessageIds",
      { ...validThread, stationMessageIds: [1, 1] },
    ],
    ["zero in stationMessageIds", { ...validThread, stationMessageIds: [0] }],
    [
      "negative in stationMessageIds",
      { ...validThread, stationMessageIds: [-1] },
    ],
    [
      "string in stationMessageIds",
      { ...validThread, stationMessageIds: ["1"] },
    ],
    ["null stationMessageIds", { ...validThread, stationMessageIds: null }],
    [
      "messages containing leaked staff",
      { ...validThread, messages: [{ ...validMessage, staff: "7" }] },
    ],
    ["messages not array", { ...validThread, messages: "none" }],
    ["leaked staff on thread", { ...validThread, staff: "7" }],
    ["leaked userId on thread", { ...validThread, userId: 7 }],
    ["activationId zero", { ...validThread, activationId: 0 }],
    ["non-string station", { ...validThread, station: null }],
    ["null", null],
  ]);
});

test("isStationThreadWithMessages requires a valid messages array", () => {
  assert.equal(
    isStationThreadWithMessages({ ...validThread, messages: [validMessage] }),
    true,
  );
  assert.equal(isStationThreadWithMessages(validThread), false);
  assert.equal(
    isStationThreadWithMessages({
      ...validThread,
      messages: [{ ...validMessage, staff: "7" }],
    }),
    false,
  );
});

test("isStationMessageEvent validates Socket.IO station-message payloads", () => {
  const validEvent = {
    message: validMessage,
    thread: { ...validThread, stationMessageIds: [1] },
    sentAt: "2026-11-11T12:00:02Z",
  };
  assert.equal(isStationMessageEvent(validEvent), true);
  assert.equal(
    isStationMessageEvent({ ...validEvent, thread: validThread }),
    true,
  );
  assert.equal(isStationMessageEvent({ ...validEvent, extra: true }), false);
  assert.equal(isStationMessageEvent({ ...validEvent, sentAt: "" }), false);
  assert.equal(
    isStationMessageEvent({
      ...validEvent,
      message: { ...validMessage, staff: "7" },
    }),
    false,
  );
  assert.equal(
    isStationMessageEvent({
      ...validEvent,
      thread: { ...validThread, messages: [validMessage] },
    }),
    false,
  );
  assert.equal(isStationMessageEvent({ ...validEvent, thread: {} }), false);
  assert.equal(isStationMessageEvent(null), false);
});

test("isStationThreadsClosed validates Socket.IO station-threads-closed payloads", () => {
  const validEvent = { activationId: 1, sentAt: "2026-11-11T12:05:00Z" };
  assert.equal(isStationThreadsClosed(validEvent), true);
  assert.equal(
    isStationThreadsClosed({ activationId: 0, sentAt: validEvent.sentAt }),
    false,
  );
  assert.equal(isStationThreadsClosed({ activationId: 1, sentAt: "" }), false);
  assert.equal(isStationThreadsClosed({ ...validEvent, extra: "x" }), false);
  assert.equal(isStationThreadsClosed(null), false);
});
