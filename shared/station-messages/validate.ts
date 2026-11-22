import type {
  StationMessageEvent,
  StationThreadsClosed,
} from "../socket/events";
import type { StationMessage } from "../types/v1/station-message";
import type { StationMessageRequest } from "../types/v1/station-message-request";
import type { StationThread } from "../types/v1/station-thread";

const MAX_MESSAGE_LENGTH = 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([Zz]|([+-])(\d{2}):(\d{2}))$/;
const DAYS_IN_MONTH = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const REQUEST_KEYS = new Set([
  "clientMessageId",
  "activationId",
  "text",
  "writtenAt",
]);
const MESSAGE_KEYS = new Set([
  "id",
  "clientMessageId",
  "activationId",
  "station",
  "sender",
  "text",
  "writtenAt",
  "receivedAt",
]);
const THREAD_KEYS = new Set([
  "activationId",
  "station",
  "state",
  "unansweredSince",
  "lastMessageAt",
  "stationMessageIds",
  "messages",
]);
const MESSAGE_EVENT_KEYS = new Set(["message", "thread", "sentAt"]);
const THREADS_CLOSED_KEYS = new Set(["activationId", "sentAt"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyAllowedKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

// Validates RFC 3339 date-time strings, matching Ajv's date-time format.
function isRfc3339DateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_TIME_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const maxDay = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month];
  if (day < 1 || day > maxDay) return false;

  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (hour > 23 || minute > 59 || second > 60) return false;

  const tzSign = match[8] === "-" ? -1 : 1;
  const tzHour = match[9] ? Number(match[9]) : 0;
  const tzMinute = match[10] ? Number(match[10]) : 0;
  if (tzHour > 23 || tzMinute > 59) return false;

  if (second < 60) return true;
  // RFC 3339 leap second is only valid at 23:59:60 UTC.
  const utcMinute = minute - tzMinute * tzSign;
  const utcHour = hour - tzHour * tzSign - (utcMinute < 0 ? 1 : 0);
  return (
    (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1)
  );
}

function isMessageText(
  value: unknown,
  requireNonWhitespace: boolean,
): value is string {
  if (typeof value !== "string") return false;
  const length = [...value].length;
  if (length < 1 || length > MAX_MESSAGE_LENGTH) return false;
  return !requireNonWhitespace || /\S/.test(value);
}

export function isStationMessageRequest(
  value: unknown,
): value is StationMessageRequest {
  if (!isPlainObject(value) || !hasOnlyAllowedKeys(value, REQUEST_KEYS)) {
    return false;
  }
  return (
    isUuid(value.clientMessageId) &&
    isPositiveInteger(value.activationId) &&
    isMessageText(value.text, true) &&
    isRfc3339DateTime(value.writtenAt)
  );
}

export function isStationMessage(value: unknown): value is StationMessage {
  if (!isPlainObject(value) || !hasOnlyAllowedKeys(value, MESSAGE_KEYS)) {
    return false;
  }
  return (
    isPositiveInteger(value.id) &&
    isUuid(value.clientMessageId) &&
    isPositiveInteger(value.activationId) &&
    typeof value.station === "string" &&
    (value.sender === "STATION" || value.sender === "CONTROL_ROOM") &&
    isMessageText(value.text, false) &&
    isRfc3339DateTime(value.writtenAt) &&
    isRfc3339DateTime(value.receivedAt)
  );
}

export function isStationThread(value: unknown): value is StationThread {
  if (!isPlainObject(value) || !hasOnlyAllowedKeys(value, THREAD_KEYS)) {
    return false;
  }
  if (
    !isPositiveInteger(value.activationId) ||
    typeof value.station !== "string" ||
    (value.state !== "UNANSWERED" && value.state !== "ANSWERED")
  ) {
    return false;
  }
  const unansweredValid =
    value.state === "UNANSWERED"
      ? isRfc3339DateTime(value.unansweredSince)
      : value.unansweredSince === null;
  if (!unansweredValid) return false;

  if (value.lastMessageAt !== null && !isRfc3339DateTime(value.lastMessageAt)) {
    return false;
  }
  if (value.stationMessageIds !== undefined) {
    if (
      !Array.isArray(value.stationMessageIds) ||
      !value.stationMessageIds.every(isPositiveInteger) ||
      new Set(value.stationMessageIds).size !== value.stationMessageIds.length
    ) {
      return false;
    }
  }
  if (value.messages !== undefined) {
    if (
      !Array.isArray(value.messages) ||
      !value.messages.every(isStationMessage)
    ) {
      return false;
    }
  }
  return true;
}

export function isStationThreadWithMessages(
  value: unknown,
): value is StationThread & { messages: StationMessage[] } {
  return isStationThread(value) && Array.isArray(value.messages);
}

export function isStationMessageEvent(
  value: unknown,
): value is StationMessageEvent {
  if (!isPlainObject(value) || !hasOnlyAllowedKeys(value, MESSAGE_EVENT_KEYS)) {
    return false;
  }
  return (
    isStationMessage(value.message) &&
    isStationThread(value.thread) &&
    value.thread.messages === undefined &&
    isRfc3339DateTime(value.sentAt)
  );
}

export function isStationThreadsClosed(
  value: unknown,
): value is StationThreadsClosed {
  if (
    !isPlainObject(value) ||
    !hasOnlyAllowedKeys(value, THREADS_CLOSED_KEYS)
  ) {
    return false;
  }
  return (
    isPositiveInteger(value.activationId) && isRfc3339DateTime(value.sentAt)
  );
}
