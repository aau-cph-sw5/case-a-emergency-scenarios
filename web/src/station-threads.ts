import { FormatError } from "../../shared/api/http";
import { ERROR_CODES } from "../../shared/error-codes";
import {
  isStationMessage,
  isStationMessageRequest,
  isStationThreadSummary,
  isStationThreadWithMessages,
  type StationThreadSummary,
} from "../../shared/station-messages/validate";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request";
import { ApiError, getJson, postJson, userMessage } from "./get-json";

const threadsPath = "/api/v1/station-threads";

export function fetchStationThreads(token: string, signal: AbortSignal) {
  return getJson(
    threadsPath,
    token,
    (value): value is StationThreadSummary[] =>
      Array.isArray(value) && value.every(isStationThreadSummary),
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
    isStationThreadWithMessages,
    signal,
  );
}

export function sendStationMessage(
  token: string,
  station: string,
  request: StationMessageRequest,
) {
  if (!isStationMessageRequest(request)) {
    return Promise.reject(new FormatError("a station message request"));
  }
  return postJson(
    `${threadsPath}/${encodeURIComponent(station)}/messages`,
    token,
    isStationMessage,
    request,
  );
}

export function stationMessageError(error: unknown): string {
  if (error instanceof FormatError) {
    return "Beskeden har et ugyldigt format.";
  }
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
