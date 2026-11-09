import { ERROR_CODES } from "../../../shared/error-codes";
import type { PositionReport } from "../../../shared/types/v1/position-report";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { sendPositionReport } from "../api/position-report";

// A steward's status, as the contract names it (scenario-state.schema.json).
// The app declares no status type of its own (MET-A-015).
export type StewardStatusValue = ScenarioState["deployments"][number]["status"];

// The steward's own status in one activation: the station and how far along.
// CHECKED_OUT keeps the station the steward left, so the app can say so.
export type OwnStatus = { station: string; status: StewardStatusValue };

// What the steward asks for: their current status (e.g. after logging in
// again), on the way to a station, arrival, cancelling while on the way, or
// checking out after arriving.
export type StatusRequest =
  | { type: "current" }
  | { type: "assign"; station: string }
  | { type: "arrive" }
  | { type: "cancel" }
  | { type: "checkOut" };

export type StatusResult =
  | { ok: true; own: OwnStatus | null }
  | { ok: false; code?: string; message: string };

// The steward's status, the one place the app reads or changes it (MET-A-015,
// #263, #305). Every change is a position report with an event (contract
// 7.1.0, #299), sent before the status changes in the app:
// - assign: EN_ROUTE. Allowed with no status, while on the way (a change of
//   mind frees the old station) and after checking out. After arriving the
//   steward checks out first.
// - arrive: ARRIVED, only while on the way.
// - cancel: CANCELLED, only while on the way. The steward has no status
//   afterwards.
// - checkOut: CHECKED_OUT, only after arriving.
// The app checks the same rules as the server (E1006), so nothing invalid is
// sent. There is no endpoint for the steward's latest report yet (#253), so
// the last status is remembered in memory per steward per activation, which
// survives logging out and in again.
const remembered = new Map<string, OwnStatus>();

const NOT_ALLOWED: Record<Exclude<StatusRequest["type"], "current">, string> = {
  assign: "Tjek ud fra din station, før du melder dig til en ny.",
  arrive:
    "Du kan først godkende ankomst, når du er meldt på vej til en station.",
  cancel: "Du kan kun fortryde, mens du er på vej.",
  checkOut: "Du kan først tjekke ud, når du er ankommet.",
};

export async function stewardStatus(
  token: string,
  // A number since contract 7.0.0; taken from the contract, not declared here.
  activationId: ScenarioState["activationId"],
  userId: string,
  request: StatusRequest,
): Promise<StatusResult> {
  const key = `${activationId}/${userId}`;
  const current = remembered.get(key);

  if (request.type === "current") {
    return { ok: true, own: current ?? null };
  }

  const change = nextStatus(current, request);
  if (change === null) {
    return {
      ok: false,
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
      message: NOT_ALLOWED[request.type],
    };
  }

  const report = await sendPositionReport(
    token,
    change.station,
    activationId,
    change.event,
  );
  if (!report.ok) return { ok: false, message: report.message };

  if (change.own === null) remembered.delete(key);
  else remembered.set(key, change.own);
  return { ok: true, own: change.own };
}

// What to send and the status afterwards, or null when the change is not
// allowed from the current status.
function nextStatus(
  current: OwnStatus | undefined,
  request: Exclude<StatusRequest, { type: "current" }>,
): {
  station: string;
  event: NonNullable<PositionReport["event"]>;
  own: OwnStatus | null;
} | null {
  const status = current?.status;
  switch (request.type) {
    case "assign":
      return status === "MANNED" || status === "TASK_DONE"
        ? null
        : {
            station: request.station,
            event: "EN_ROUTE",
            own: { station: request.station, status: "PENDING" },
          };
    case "arrive":
      return current && status === "PENDING"
        ? {
            station: current.station,
            event: "ARRIVED",
            own: { station: current.station, status: "MANNED" },
          }
        : null;
    case "cancel":
      return current && status === "PENDING"
        ? { station: current.station, event: "CANCELLED", own: null }
        : null;
    case "checkOut":
      return current && (status === "MANNED" || status === "TASK_DONE")
        ? {
            station: current.station,
            event: "CHECKED_OUT",
            own: { station: current.station, status: "CHECKED_OUT" },
          }
        : null;
  }
}

// Test helper: forgets every remembered status.
export function resetRememberedStatuses(): void {
  remembered.clear();
}
