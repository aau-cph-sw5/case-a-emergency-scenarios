import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import type { PositionReport } from "../../../shared/types/v1/position-report";
import { apiBaseUrl } from "../api-base-url";

// What the steward reads for each refusal; the server's message is for developers.
const REPORT_ERRORS: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
  [ERROR_CODES.ROLE_NOT_PERMITTED]: "Kun stewards kan rapportere en position.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
};

export type PositionReportResult = { ok: boolean; message: string };

// Sends a position report over HTTP; returns whether it was accepted and the
// text to show the steward. The server forwards an accepted report to the
// operators over the socket. event says what the report means (contract
// 7.1.0); left out, the server reads it as on the way.
export async function sendPositionReport(
  token: string,
  station: string,
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
        staff: "",
        station,
        reportedAt: new Date().toISOString(),
        ...(event === undefined ? {} : { event }),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) return { ok: true, message: `Position sendt: ${station}` };

    const body = await response.json().catch(() => null);
    return {
      ok: false,
      message:
        REPORT_ERRORS[body?.error?.code] ?? "Positionen blev ikke modtaget.",
    };
  } catch {
    return { ok: false, message: "Ingen forbindelse til serveren." };
  }
}
