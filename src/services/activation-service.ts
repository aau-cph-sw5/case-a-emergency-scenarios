import { getDatabase, type Db } from "../db/client.js";
import {
  closeActivation,
  createActivation,
  findActivation,
  findActiveActivation,
  lockActivationLifecycle,
  type StoredActivation,
} from "../repositories/activation-repository.js";
import type { Scenario } from "../../shared/types/v1/scenario.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent, type NewIncidentEvent } from "./incident-log-service.js";

type WriteEvent = typeof appendEvent;
export type LoggedActivationResult =
  | { kind: "already-active" }
  | { kind: "ok"; activation: StoredActivation; sequence: number };
export type StandDownResult =
  | { kind: "ok"; activation: StoredActivation }
  | { kind: "not-found" }
  | { kind: "already-closed" };
export type SwitchResult =
  LoggedActivationResult | { kind: "replaces-not-active" };

function event(type: string, id: number, scenarioId: string): NewIncidentEvent {
  return {
    type,
    schemaVersion: 1,
    subject: { type: "activation", id: String(id) },
    activationId: String(id),
    payload: { scenarioId },
  };
}

async function insertAndLog(
  tx: Db,
  user: AuthUser,
  scenario: Scenario,
  writeEvent: WriteEvent,
): Promise<LoggedActivationResult> {
  const id = await createActivation(
    tx,
    scenario.scenarioId,
    scenario.currentVersion,
    user.userId,
  );
  const logged = await writeEvent(
    tx,
    user,
    event("SCENARIO_ACTIVATED", id, scenario.scenarioId),
  );
  const activation = await findActivation(id, tx);
  if (!activation) throw new Error(`Activation ${id} could not be read`);
  return { kind: "ok", activation, sequence: Number(logged.sequence) };
}

// The lifecycle lock serializes activation, stand-down and switching across
// server processes; the changes and incident events commit together.
export function activateAndLog(
  user: AuthUser,
  scenario: Scenario,
  _username: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<LoggedActivationResult> {
  return getDatabase().begin(async (tx) => {
    await lockActivationLifecycle(tx);
    if (await findActiveActivation(scenario.lineGroup, tx))
      return { kind: "already-active" };
    return insertAndLog(tx, user, scenario, writeEvent);
  });
}

export function standDownAndLog(
  user: AuthUser,
  id: number,
  writeEvent: WriteEvent = appendEvent,
): Promise<StandDownResult> {
  return getDatabase().begin(async (tx) => {
    await lockActivationLifecycle(tx);
    const activation = await findActivation(id, tx);
    if (!activation || activation.lineGroup !== user.lineGroup)
      return { kind: "not-found" };
    if (activation.status === "CLOSED") return { kind: "already-closed" };
    await closeActivation(tx, id);
    await writeEvent(
      tx,
      user,
      event("SCENARIO_STOOD_DOWN", id, activation.scenarioId),
    );
    const closed = await findActivation(id, tx);
    if (!closed) throw new Error(`Activation ${id} could not be read`);
    return { kind: "ok", activation: closed };
  });
}

export function switchAndLog(
  user: AuthUser,
  scenario: Scenario,
  _username: string,
  replaces: number,
  writeEvent: WriteEvent = appendEvent,
): Promise<SwitchResult> {
  return getDatabase().begin(async (tx) => {
    await lockActivationLifecycle(tx);
    // Only the active scenario in the same line group can be replaced.
    const active = await findActiveActivation(scenario.lineGroup, tx);
    if (active?.activationId !== replaces)
      return { kind: "replaces-not-active" };
    await closeActivation(tx, replaces);
    await writeEvent(
      tx,
      user,
      event("SCENARIO_STOOD_DOWN", replaces, active.scenarioId),
    );
    return insertAndLog(tx, user, scenario, writeEvent);
  });
}
