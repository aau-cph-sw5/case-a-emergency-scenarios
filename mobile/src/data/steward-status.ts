import { ERROR_CODES } from "../../../shared/error-codes";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import { apiBaseUrl } from "../api-base-url";

// A steward's status, as the contract names it (scenario-state.schema.json).
// The app declares no status type of its own (MET-A-015).
export type StewardStatusValue = ScenarioState["deployments"][number]["status"];

// The steward's own status in one activation: the station and how far along.
export type OwnStatus = { station: string; status: StewardStatusValue };

// What the steward asks for: their current status (e.g. after logging in
// again), assign to a station, check in there, or check out.
export type StatusRequest =
  | { type: "current" }
  | { type: "assign"; station: string }
  | { type: "arrive" }
  | { type: "checkout" };

export type StatusResult =
  | { ok: true; own: OwnStatus | null }
  | { ok: false; code?: string; message: string };

const PATHS = {
  assign: "assign",
  arrive: "check-in",
  checkout: "check-out",
} as const;

// What the steward reads for each refusal; the server's message is for developers.
const ERRORS: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
  [ERROR_CODES.INVALID_STATUS_TRANSITION]:
    "Den status kan du ikke skifte til lige nu.",
};

// The steward's status, the one place the app reads or changes it (MET-A-015,
// #263). The server keeps it on the deployments (contract 7.0.0): assign,
// check in and check out each answer with the scenario state, and the current
// status is read from GET /api/v1/scenario-state.
export async function stewardStatus(
  token: string,
  activationId: string,
  userId: string,
  request: StatusRequest,
): Promise<StatusResult> {
  const current = request.type === "current";
  const path = current
    ? "scenario-state"
    : `steward-status/${PATHS[request.type]}`;
  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/${path}`, {
      method: current ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body:
        request.type === "assign"
          ? JSON.stringify({ station: request.station })
          : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const code = body?.error?.code;
      return {
        ok: false,
        code,
        message: ERRORS[code] ?? "Statussen blev ikke ændret.",
      };
    }
    // Check out leaves no deployment with the steward: no status.
    const own = (body as ScenarioState | null)?.deployments.find(
      (deployment) => deployment.staff === userId,
    );
    return {
      ok: true,
      own:
        own && body.activationId === activationId
          ? { station: own.fulfills, status: own.status }
          : null,
    };
  } catch {
    return { ok: false, message: "Ingen forbindelse til serveren." };
  }
}
