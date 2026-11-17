import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
import type { StationThread } from "../../../shared/types/v1/station-thread";
import { apiBaseUrl } from "../api-base-url";

// The contract's limit for a message, counted in Unicode code points.
export const MAX_MESSAGE_LENGTH = 1000;

// The number of characters in a message as the contract counts them.
export function messageLength(text: string): number {
  return [...text].length;
}

// True when the server would accept the text: something that is not
// whitespace, and at most MAX_MESSAGE_LENGTH characters.
export function isSendableText(text: string): boolean {
  return text.trim().length > 0 && messageLength(text) <= MAX_MESSAGE_LENGTH;
}

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

// What the chat asks for: the station's thread with its messages, or to send
// one message the steward has written.
export type ThreadRequest =
  { type: "read" } | ({ type: "send" } & StationMessageRequest);

type ThreadAnswer = { read: StationThread; send: StationMessage };

// offline is true when the server was not reached, so nothing was refused.
export type ThreadResult<T> =
  | { ok: true; value: T }
  | { ok: false; code?: string; message: string; offline: boolean };

// The station's thread, the one place the steward app reads or writes it
// (MET-A-029, #335). The steward must be checked in (ARRIVED) at the station;
// otherwise the server refuses with E1007.
export async function stationThread<R extends ThreadRequest>(
  token: string,
  station: string,
  request: R,
): Promise<ThreadResult<ThreadAnswer[R["type"]]>> {
  const path = `${apiBaseUrl}/api/v1/station-threads/${encodeURIComponent(station)}`;
  let response: Response;
  try {
    if (request.type === "read") {
      response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } else {
      const body: StationMessageRequest = {
        clientMessageId: request.clientMessageId,
        activationId: request.activationId,
        text: request.text,
        writtenAt: request.writtenAt,
      };
      response = await fetch(`${path}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    }
  } catch {
    return { ok: false, message: NO_CONNECTION, offline: true };
  }

  // 200 reads the thread; for a message 201 stores it and 200 means the
  // server already had it, so both count as sent.
  if (response.ok) {
    return {
      ok: true,
      value: (await response.json()) as ThreadAnswer[R["type"]],
    };
  }
  const error = await response.json().catch(() => null);
  const code: unknown = error?.error?.code;
  return {
    ok: false,
    message: threadErrorMessage(typeof code === "string" ? code : undefined),
    offline: false,
    ...(typeof code === "string" ? { code } : {}),
  };
}
