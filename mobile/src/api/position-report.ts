import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import { apiBaseUrl } from "../api-base-url";
import type { QueuedPositionReport } from "../../../shared/offline/position-report-queue";

export type ReportDeliveryResult =
  | { status: "accepted" }
  | { status: "retry" }
  | { status: "rejected"; httpStatus: number; code?: string };

// What the steward reads for each refusal; the server's message is for developers.
const REPORT_ERRORS: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
  [ERROR_CODES.ROLE_NOT_PERMITTED]: "Kun stewards kan rapportere en position.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
};

export async function deliverPositionReport( //sends a position report to the server and returns the result of the delivery attempt
  token: string,
  report: QueuedPositionReport,
): Promise<ReportDeliveryResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/position-reports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: report.id,
        staff: "",
        station: report.station,
        reportedAt: report.reportedAt,
        ...(report.event !== undefined ? { event: report.event } : {}),
        ...(report.taskDone !== undefined ? { taskDone: report.taskDone } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), //abort the request if it takes longer than the specified timeout
    });

    if (response.status === 202) {
      return { status: "accepted" };
    }

    if (response.status === 429 || response.status >= 500) {
      return { status: "retry" };
    }

    const body = await response.json().catch(() => null);

    return {
      status: "rejected",
      httpStatus: response.status,
      code: body?.error?.code,
    };
  } catch {
    return { status: "retry" };
  }
}

// Sends a position report over HTTP; returns the text to show the steward.
// The server forwards an accepted report to the operators over the socket.
export async function sendPositionReport(
  token: string,
  station: string,
): Promise<string> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/position-reports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        staff: "",
        station,
        reportedAt: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return `Position sendt: ${station}`;

    const body = await response.json().catch(() => null);
    return REPORT_ERRORS[body?.error?.code] ?? "Positionen blev ikke modtaget.";
  } catch {
    return "Ingen forbindelse til serveren.";
  }
}
