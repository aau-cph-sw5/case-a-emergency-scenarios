import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import type { QueuedStationMessage } from "../../../shared/offline/station-message-queue";
import {
  isStationMessage,
  isStationMessageRequest,
} from "../../../shared/station-messages/validate";
import type { StationMessage } from "../../../shared/types/v1/station-message";
import type { StationMessageRequest } from "../../../shared/types/v1/station-message-request";
import { apiBaseUrl } from "../api-base-url";

export type MessageDeliveryResult =
  | { status: "accepted"; message: StationMessage }
  | { status: "retry" }
  | { status: "rejected"; httpStatus: number; code?: string };

// Sends one queued message to its station's thread. 201 stores it and 200
// means the server already had it, so both count as delivered.
export async function deliverStationMessage(
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
      code: ERROR_CODES.MISSING_PARAMETER,
    };
  }
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/v1/station-threads/${encodeURIComponent(message.station)}/messages`,
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
      if (!isStationMessage(data)) {
        return { status: "retry" };
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
    return { status: "retry" }; // no connection or no answer in time
  }
}
