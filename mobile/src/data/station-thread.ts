import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import {
  isSendableText,
  isStationThreadWithMessages,
  MAX_MESSAGE_LENGTH,
  messageLength,
  type StationThreadWithMessages,
} from "../../../shared/station-messages/validate";
import { apiBaseUrl } from "../api-base-url";

export { isSendableText, MAX_MESSAGE_LENGTH, messageLength };

// What the steward reads when the server refuses to read or take a message;
// the server's own message is for developers. The codes that close the chat
// (not checked in, stood down) are also why the chat is closed.
const THREAD_ERRORS: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
  [ERROR_CODES.ROLE_NOT_PERMITTED]:
    "Kun stewards kan skrive til kontrolrummet.",
  [ERROR_CODES.MISSING_PARAMETER]:
    "Beskeden skal have tekst og må højst være 1000 tegn.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.SCENARIO_STOOD_DOWN]: "Scenariet er afsluttet.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
  [ERROR_CODES.NOT_CHECKED_IN_AT_STATION]:
    "Du er ikke tjekket ind på stationen.",
};

// The text the steward reads for a refusal with the given error code.
export function threadErrorMessage(code?: string): string {
  return (code && THREAD_ERRORS[code]) ?? "Serveren afviste beskeden.";
}

// Refusals that mean the steward has no thread any more: the chat closes.
export function closesThread(code?: string): boolean {
  return (
    code === ERROR_CODES.NOT_CHECKED_IN_AT_STATION ||
    code === ERROR_CODES.SCENARIO_STOOD_DOWN ||
    code === ERROR_CODES.NO_ACTIVE_SCENARIO ||
    code === ERROR_CODES.STATION_NOT_IN_SCENARIO
  );
}

export const NO_CONNECTION = "Ingen forbindelse til serveren.";
export const SERVER_FAILED = "Serveren kunne ikke svare. Vi prøver igen.";

export type ThreadResult<T> =
  { ok: true; value: T } | { ok: false; code?: string; message: string };

// Reads one station's thread from the server (MET-A-029, #335, #445). The
// steward must be checked in (ARRIVED) at the station; otherwise the server
// refuses with E1007.
export async function readStationThread(
  token: string,
  station: string,
): Promise<ThreadResult<StationThreadWithMessages>> {
  const path = `${apiBaseUrl}/api/v1/station-threads/${encodeURIComponent(station)}`;
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, message: NO_CONNECTION };
  }

  // A body that breaks off or is not JSON is treated like no connection.
  // A JSON body that does not match the contract schema is rejected as a
  // server failure so malformed or identity-leaking payloads are never shown.
  if (response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { ok: false, message: NO_CONNECTION };
    }
    if (!isStationThreadWithMessages(body)) {
      return { ok: false, message: SERVER_FAILED };
    }
    return {
      ok: true,
      value: body,
    };
  }
  const error = await response.json().catch(() => null);
  const code: unknown = error?.error?.code;
  return {
    ok: false,
    message:
      response.status >= 500
        ? SERVER_FAILED
        : threadErrorMessage(typeof code === "string" ? code : undefined),
    ...(typeof code === "string" ? { code } : {}),
  };
}
