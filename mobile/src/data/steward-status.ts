import { ERROR_CODES } from "../../../shared/error-codes";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { sendPositionReport } from "../api/position-report";

// A steward's status, as the contract names it (scenario-state.schema.json).
// The app declares no status type of its own (MET-A-015).
export type StewardStatusValue = ScenarioState["deployments"][number]["status"];

// The steward's own status in one activation: the station and how far along.
export type OwnStatus = { station: string; status: StewardStatusValue };

// What the steward asks for: their current status (e.g. after logging in
// again), report on the way to a station, or arrival at the station they are
// on the way to.
export type StatusRequest =
  | { type: "current" }
  | { type: "assign"; station: string }
  | { type: "arrive" };

export type StatusResult =
  | { ok: true; own: OwnStatus | null }
  | { ok: false; code?: string; message: string };

// The steward's status, the one place the app reads or changes it (MET-A-015,
// #263). As agreed in #268, going on the way is a position report to the
// server, through the existing position-report endpoint (#271). A new
// station can be reported at any time, like the server allows.
//
// Two parts are kept in the app until the server supports them:
// - Arrival: the contract has no way to report arrival separately from on
//   the way yet (a report means "on the way or arrived"), so arrival is only
//   shown to the steward and is not sent.
// - The current status: there is no endpoint for the steward's latest report
//   yet (#253), so the last status is remembered in memory per steward per
//   activation, which survives logging out and in again.
const remembered = new Map<string, OwnStatus>();

const NOT_ON_THE_WAY =
  "Du kan først godkende ankomst, når du er meldt på vej til en station.";

export async function stewardStatus(
  token: string,
  activationId: string,
  userId: string,
  request: StatusRequest,
): Promise<StatusResult> {
  const key = `${activationId}/${userId}`;
  const current = remembered.get(key);

  if (request.type === "current") {
    return { ok: true, own: current ?? null };
  }

  if (request.type === "assign") {
    const report = await sendPositionReport(token, request.station);
    if (!report.ok) return { ok: false, message: report.message };
    const own: OwnStatus = { station: request.station, status: "PENDING" };
    remembered.set(key, own);
    return { ok: true, own };
  }

  if (current?.status !== "PENDING") {
    return {
      ok: false,
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      message: NOT_ON_THE_WAY,
    };
  }
  const own: OwnStatus = { station: current.station, status: "MANNED" };
  remembered.set(key, own);
  return { ok: true, own };
}

// Test helper: forgets every remembered status.
export function resetRememberedStatuses(): void {
  remembered.clear();
}
