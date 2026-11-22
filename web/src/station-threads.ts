import { ERROR_CODES } from "../../shared/error-codes";
import {
  isStationMessage,
  isStationMessageRequest,
  isStationThread,
  isStationThreadWithMessages,
} from "../../shared/station-messages/validate";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request";
import type { StationThread } from "../../shared/types/v1/station-thread";
import { ApiError, getJson, postJson, userMessage } from "./get-json";

const threadsPath = "/api/v1/station-threads";

export function fetchStationThreads(token: string, signal: AbortSignal) {
  return getJson(
    threadsPath,
    token,
    (value): value is StationThread[] =>
      Array.isArray(value) &&
      value.every(
        (entry) =>
          isStationThread(entry) && Array.isArray(entry.stationMessageIds),
      ),
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
    return Promise.reject(
      new Error("POST station message request is in an unexpected format"),
    );
  }
  return postJson(
    `${threadsPath}/${encodeURIComponent(station)}/messages`,
    token,
    isStationMessage,
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
