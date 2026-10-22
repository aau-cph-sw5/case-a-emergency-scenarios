import { ERROR_CODES } from "../../../shared/error-codes";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import { apiBaseUrl } from "../api-base-url";

// What the steward reads for each refusal; the server's message is for developers.
const REPORT_ERRORS: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
  [ERROR_CODES.ROLE_NOT_PERMITTED]: "Kun stewards kan rapportere en position.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
};

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
