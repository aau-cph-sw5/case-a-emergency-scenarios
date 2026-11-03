import { ERROR_CODES } from "../../../shared/error-codes";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import {
  INVALID_STATUS_TRANSITION,
  type OwnStatus,
} from "../data/steward-status";

// What the steward reads for each refusal; the server's message is for
// developers (MET-A-015 criterion 3, in the steward's language).
const STATUS_ERRORS: Record<string, string> = {
  [INVALID_STATUS_TRANSITION]: "Den status kan du ikke skifte til lige nu.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
};

export function statusErrorMessage(code: string): string {
  return STATUS_ERRORS[code] ?? "Din status blev ikke modtaget. Prøv igen.";
}

// The activation's deployments with the steward's own status filled in, so
// the overview, the coverage and the highlight from #158 show it straight
// away. The steward's existing deployment is updated; otherwise an empty one
// at the station is taken, or a new one is added.
export function withOwnStatus(
  state: ScenarioState,
  userId: string,
  own: OwnStatus | null,
): ScenarioState {
  if (own === null) return state;
  const mine = (d: ScenarioState["deployments"][number]) =>
    d.staff !== null && d.staff !== undefined && String(d.staff) === userId;
  const deployments = state.deployments.map((d) => ({ ...d }));
  const ownDeployment = {
    status: own.status,
    staff: userId,
    fulfills: own.station,
  };

  const existing = deployments.findIndex(mine);
  if (existing !== -1) {
    deployments[existing] = { ...deployments[existing], ...ownDeployment };
    return { ...state, deployments };
  }
  const empty = deployments.findIndex(
    (d) =>
      d.fulfills === own.station && (d.staff === null || d.staff === undefined),
  );
  if (empty !== -1) {
    deployments[empty] = { ...deployments[empty], ...ownDeployment };
    return { ...state, deployments };
  }
  return { ...state, deployments: [...deployments, ownDeployment] };
}
