import { ERROR_CODES } from "../../../shared/error-codes";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";

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
  | { ok: false; code: string; message: string };

// E1006 comes with the status contract in #261. Use
// ERROR_CODES.INVALID_STATUS_TRANSITION once that is merged.
export const INVALID_STATUS_TRANSITION = "E1006";

// STUB: the server does not accept status changes yet (MET-A-015, #262). This
// function stands in for it and is the only place the app reads or changes
// the steward's status, so swapping the stub for the real endpoint does not
// touch the view. It keeps each steward's status per activation in memory,
// like the server would keep it across logins, and answers like the server:
// only valid transitions are accepted, and an invalid one gets the
// contract's error code with the server's message.
const stubStatuses = new Map<string, OwnStatus>();

export async function stewardStatus(
  activationId: string,
  userId: string,
  scenarioStations: string[],
  request: StatusRequest,
): Promise<StatusResult> {
  const key = `${activationId}/${userId}`;
  const current = stubStatuses.get(key);

  if (request.type === "current") {
    return { ok: true, own: current ?? null };
  }

  if (request.type === "assign") {
    if (current !== undefined) {
      return rejected(
        INVALID_STATUS_TRANSITION,
        "The status change is not permitted from the steward's current status",
      );
    }
    if (!scenarioStations.includes(request.station)) {
      return rejected(
        ERROR_CODES.STATION_NOT_IN_SCENARIO,
        "The station is not part of the active scenario",
      );
    }
    const own: OwnStatus = { station: request.station, status: "PENDING" };
    stubStatuses.set(key, own);
    return { ok: true, own };
  }

  if (current?.status !== "PENDING") {
    return rejected(
      INVALID_STATUS_TRANSITION,
      "The status change is not permitted from the steward's current status",
    );
  }
  const own: OwnStatus = { station: current.station, status: "MANNED" };
  stubStatuses.set(key, own);
  return { ok: true, own };
}

function rejected(code: string, message: string): StatusResult {
  return { ok: false, code, message };
}

// Test helper: forgets every stored status.
export function resetStubStatuses(): void {
  stubStatuses.clear();
}
