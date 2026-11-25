import { ERROR_CODES } from "../error-codes";
import { REQUEST_TIMEOUT_MS } from "../http";
import type { QueuedStationMessage } from "../offline/station-message-queue";
import {
  isSendableText,
  isStationMessage,
  isStationMessageRequest,
} from "./validate";
import type { StationMessage } from "../types/v1/station-message";
import type { StationMessageRequest } from "../types/v1/station-message-request";

export type MessageDeliveryResult =
  | { status: "accepted"; message: StationMessage }
  | { status: "retry" }
  | { status: "rejected"; httpStatus: number; code?: string };

// Creates the HTTP deliverer for one API origin. 201 stores the message and
// 200 means the server already had it, so both count as delivered.
export function createStationMessageDeliverer(baseUrl: string) {
  return async function deliverStationMessage(
    token: string,
    message: QueuedStationMessage,
  ): Promise<MessageDeliveryResult> {
    const body: StationMessageRequest = {
      clientMessageId: message.clientMessageId,
      activationId: message.activationId,
      text: message.text,
      writtenAt: message.writtenAt,
    };
    if (!isStationMessageRequest(body)) {
      return {
        status: "rejected",
        httpStatus: 400,
        ...(isSendableText(message.text)
          ? {}
          : { code: ERROR_CODES.MISSING_PARAMETER }),
      };
    }
    try {
      const response = await fetch(
        `${baseUrl}/api/v1/station-threads/${encodeURIComponent(message.station)}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (response.status === 200 || response.status === 201) {
        const data: unknown = await response.json();
        // A schema-invalid 2xx body must not return retry: the server already
        // persisted the row and would return the same body forever, blocking
        // every later queued message behind it.
        if (!isStationMessage(data)) {
          return { status: "rejected", httpStatus: 422 };
        }
        return {
          status: "accepted",
          message: data,
        };
      }
      if (response.status === 429 || response.status >= 500) {
        return { status: "retry" };
      }
      const error = await response.json().catch(() => null);
      const code: unknown = error?.error?.code;
      return {
        status: "rejected",
        httpStatus: response.status,
        ...(typeof code === "string" ? { code } : {}),
      };
    } catch {
      return { status: "retry" };
    }
  };
}
