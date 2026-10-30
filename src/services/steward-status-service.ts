import { getDatabase, type Db } from "../db/client.js";
import { classifyStatusChange } from "../../shared/scenario/steward-status.js";
import type { StewardStatus } from "../../shared/types/v1/steward-status.js";
import type { StewardStatusRequest } from "../../shared/types/v1/steward-status-request.js";
import {
  findStatus,
  insertFirstStatus,
  listStatuses,
  updateStatusIf,
  type StatusKey,
  type StoredStewardStatus,
} from "../repositories/steward-status-repository.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;

// The active activation, as listActivations("ACTIVE") returns it.
export type ActiveActivation = { activationId: string; sequence: number };

export type StatusOutcome =
  | { result: "CHANGED" | "REPEAT"; status: StewardStatus }
  // concurrent: another request changed the status after it was read.
  | { result: "INVALID"; current: StewardStatus | null; concurrent?: true };

function toResponse(row: StoredStewardStatus): StewardStatus {
  return {
    userId: row.userId,
    activationId: row.activationId,
    station: row.station,
    status: row.status,
    changedAt: row.changedAt.toISOString(),
  };
}

function keyFor(user: AuthUser, active: ActiveActivation): StatusKey {
  return {
    activationSequence: active.sequence,
    activationId: active.activationId,
    userId: user.userId,
  };
}

// Changes the steward's status and writes its STEWARD_STATUS_CHANGED event
// with the transaction it is given, so both commit together or neither does.
// The rules are the contract's (classifyStatusChange). A repeat changes
// nothing and writes no event. If a concurrent request changed the status
// after it was read, the write finds nothing and this one is INVALID.
export async function saveStewardStatus(
  tx: Db,
  user: AuthUser,
  active: ActiveActivation,
  next: StewardStatusRequest,
  writeEvent: WriteEvent = appendEvent,
): Promise<StatusOutcome> {
  const key = keyFor(user, active);
  const current = await findStatus(tx, key);

  const change = classifyStatusChange(current, next);
  if (change === "REPEAT" && current !== null) {
    return { result: "REPEAT", status: toResponse(current) };
  }
  if (change !== "CHANGE") {
    return {
      result: "INVALID",
      current: current === null ? null : toResponse(current),
    };
  }

  const changed =
    current === null
      ? await insertFirstStatus(tx, key, next)
      : await updateStatusIf(tx, current, next);
  if (changed === null) {
    return { result: "INVALID", current: null, concurrent: true };
  }

  await writeEvent(tx, user, {
    type: "STEWARD_STATUS_CHANGED",
    schemaVersion: 1,
    subject: { type: "steward", id: String(user.userId) },
    activationId: active.activationId,
    payload: {
      stationId: changed.station,
      fromStatus: current?.status ?? null,
      fromStationId: current?.station ?? null,
      toStatus: changed.status,
    },
  });

  return { result: "CHANGED", status: toResponse(changed) };
}

export function recordStewardStatus(
  user: AuthUser,
  active: ActiveActivation,
  next: StewardStatusRequest,
): Promise<StatusOutcome> {
  return getDatabase().begin((tx) => saveStewardStatus(tx, user, active, next));
}

export async function readOwnStatus(
  user: AuthUser,
  active: ActiveActivation,
): Promise<StewardStatus | null> {
  const found = await findStatus(getDatabase(), keyFor(user, active));
  return found === null ? null : toResponse(found);
}

export async function readAllStatuses(
  active: ActiveActivation,
): Promise<StewardStatus[]> {
  const rows = await listStatuses(getDatabase(), active.sequence);
  return rows.map(toResponse);
}
