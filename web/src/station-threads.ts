import { ERROR_CODES } from "../../shared/error-codes";
import type { StationMessage } from "../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request";
import type { StationThread } from "../../shared/types/v1/station-thread";
import { ApiError, getJson, postJson, userMessage } from "./get-json";

const threadsPath = "/api/v1/station-threads";

export function isMessage(value: unknown): value is StationMessage {
  const message = value as Partial<StationMessage> | null;
  return (
    typeof message?.id === "number" &&
    typeof message.activationId === "number" &&
    typeof message.station === "string" &&
    typeof message.clientMessageId === "string" &&
    (message.sender === "STATION" || message.sender === "CONTROL_ROOM") &&
    typeof message.text === "string" &&
    typeof message.writtenAt === "string" &&
    Number.isFinite(Date.parse(message.writtenAt)) &&
    typeof message.receivedAt === "string"
  );
}

function isThread(value: unknown): value is StationThread {
  const thread = value as Partial<StationThread> | null;
  return (
    typeof thread?.activationId === "number" &&
    typeof thread.station === "string" &&
    (thread.state === "UNANSWERED" || thread.state === "ANSWERED") &&
    (thread.unansweredSince === null ||
      typeof thread.unansweredSince === "string") &&
    (thread.lastMessageAt === null || typeof thread.lastMessageAt === "string")
  );
}

export function fetchStationThreads(token: string, signal: AbortSignal) {
  return getJson(
    threadsPath,
    token,
    (value): value is StationThread[] =>
      Array.isArray(value) && value.every(isThread),
    signal,
  );
}

export function fetchStationThread(
  token: string,
  station: string,
  signal: AbortSignal,
) {
  return getJson(
    `${threadsPath}/${encodeURIComponent(station)}`,
    token,
    (value): value is StationThread =>
      isThread(value) &&
      Array.isArray(value.messages) &&
      value.messages.every(isMessage),
    signal,
  );
}

export function sendStationMessage(
  token: string,
  station: string,
  request: StationMessageRequest,
) {
  return postJson(
    `${threadsPath}/${encodeURIComponent(station)}/messages`,
    token,
    isMessage,
    request,
  );
}

export function stationMessageError(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.code === ERROR_CODES.SCENARIO_STOOD_DOWN ||
      error.code === ERROR_CODES.NO_ACTIVE_SCENARIO
    ) {
      return "Scenariet er afsluttet eller skiftet.";
    }
    if (error.code === ERROR_CODES.STATION_NOT_IN_SCENARIO) {
      return "Stationen er ikke en del af det aktive scenarie.";
    }
    if (error.status === 409) {
      return "Samtalen er ikke tilgængelig i det aktive scenarie.";
    }
    if (error.status === 404) return "Beskeder er ikke tilgængelige.";
  }
  return userMessage(error);
}
