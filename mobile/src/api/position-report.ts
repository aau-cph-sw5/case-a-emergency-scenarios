import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import type { PositionReport } from "../../../shared/types/v1/position-report";
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
  [ERROR_CODES.SCENARIO_STOOD_DOWN]:
    "Scenariet er blevet stoppet eller skiftet. Positionen blev ikke modtaget.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
  // The server has another status for the steward than the app, e.g. after a
  // reload or from another phone (#310). The app fetches the server's status.
  [ERROR_CODES.INVALID_STATUS_TRANSITION]:
    "Din status er ændret et andet sted. Vi henter din aktuelle status.",
};

// code is the server's error code when the report was refused.
export type PositionReportResult = {
  ok: boolean;
  message: string;
  code?: string;
};

export async function deliverPositionReport(
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
        activationId: report.activationId,
        staff: "",
        station: report.station,
        reportedAt: report.reportedAt,
        ...(report.event !== undefined ? { event: report.event } : {}),
        ...(report.taskDone !== undefined ? { taskDone: report.taskDone } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

// Sends a position report over HTTP; returns whether it was accepted and the
// text to show the steward. The server forwards an accepted report to the
// operators over the socket. event says what the report means (contract
// 7.1.0); left out, the server reads it as on the way.
export async function sendPositionReport(
  token: string,
  station: string,
  activationId: PositionReport["activationId"],
  event?: PositionReport["event"],
): Promise<PositionReportResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/position-reports`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activationId,
        staff: "",
        station,
        reportedAt: new Date().toISOString(),
        ...(event === undefined ? {} : { event }),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return { ok: true, message: `Position sendt: ${station}` };

    const body = await response.json().catch(() => null);
    const code: string | undefined = body?.error?.code;
    return {
      ok: false,
      message:
        (code && REPORT_ERRORS[code]) ?? "Positionen blev ikke modtaget.",
      ...(code ? { code } : {}),
    };
  } catch {
    return { ok: false, message: "Ingen forbindelse til serveren." };
  }
}
