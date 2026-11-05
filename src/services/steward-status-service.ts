import { getDatabase } from "../db/client.js";
import {
  listActivations,
  type Deployment,
  type StoredActivation,
} from "../repositories/fixture-repository.js";
import { oneAtATime } from "./activation-service.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;

export type StewardAction = "assign" | "check-in" | "check-out";

export type StewardStatusResult =
  | { kind: "ok"; activation: StoredActivation }
  | { kind: "no-active-scenario" }
  | { kind: "station-not-in-scenario" }
  | { kind: "invalid"; reason: string };

// Finds the deployment the action moves, or why it is not allowed (MET-A-015).
function findTarget(
  deployments: Deployment[],
  staff: string,
  action: StewardAction,
  station: string | undefined,
): { kind: "found"; deployment: Deployment } | StewardStatusResult {
  const own = deployments.find((d) => d.staff === staff);
  if (action === "assign") {
    if (!deployments.some((d) => d.fulfills === station)) {
      return { kind: "station-not-in-scenario" };
    }
    if (own) {
      return {
        kind: "invalid",
        reason: "Check out before assigning to another station",
      };
    }
    const free = deployments.find(
      (d) => d.fulfills === station && d.status === "UNMANNED",
    );
    return free
      ? { kind: "found", deployment: free }
      : { kind: "invalid", reason: "The station is already taken" };
  }
  if (action === "check-in" && own?.status !== "PENDING") {
    return {
      kind: "invalid",
      reason: "Assign to a station before checking in",
    };
  }
  // Check out works on the way too, so a steward can switch station.
  if (action === "check-out" && own === undefined) {
    return {
      kind: "invalid",
      reason: "Assign to a station before checking out",
    };
  }
  return { kind: "found", deployment: own! };
}

function apply(deployment: Deployment, action: StewardAction, staff: string) {
  const now = new Date().toISOString();
  if (action === "assign") {
    Object.assign(deployment, {
      status: "PENDING",
      staff,
      reportedAt: now,
      arrivedAt: null,
    });
  } else if (action === "check-in") {
    Object.assign(deployment, { status: "MANNED", arrivedAt: now });
  } else {
    // Check out clears the deployment: the steward has no status.
    Object.assign(deployment, {
      status: "UNMANNED",
      staff: null,
      reportedAt: null,
      arrivedAt: null,
    });
  }
}

// Changes the steward's own deployment in memory and writes a
// STEWARD_STATUS_CHANGED event. The change is taken back if the event does
// not commit, as in activation-service.
export function changeStewardStatus(
  user: AuthUser,
  action: StewardAction,
  station?: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<StewardStatusResult> {
  return oneAtATime(async () => {
    const [activation] = listActivations("ACTIVE");
    if (activation === undefined) return { kind: "no-active-scenario" };

    const staff = String(user.userId);
    const found = findTarget(activation.deployments, staff, action, station);
    if (found.kind !== "found") return found;
    const target = found.deployment;

    const before = { ...target };
    apply(target, action, staff);
    try {
      await getDatabase().begin((tx) =>
        writeEvent(tx, user, {
          type: "STEWARD_STATUS_CHANGED",
          schemaVersion: 1,
          subject: { type: "station", id: target.fulfills },
          activationId: activation.activationId,
          payload: {
            stationId: target.fulfills,
            fromStatus: before.status,
            toStatus: target.status,
          },
        }),
      );
    } catch (error) {
      Object.assign(target, before);
      throw error;
    }
    return { kind: "ok", activation };
  });
}
