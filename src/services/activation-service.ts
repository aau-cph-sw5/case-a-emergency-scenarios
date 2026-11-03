import { getDatabase } from "../db/client.js";
import {
  activateScenario,
  closeActivation,
  listActivations,
  reopenActivation,
  setActivationSequence,
  undoActivation,
  type ActivationResult,
  type StandDownResult,
} from "../repositories/fixture-repository.js";
import type { Scenario } from "../../shared/types/v1/scenario.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent, type NewIncidentEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;

// A successful activation also carries its event's sequence.
export type LoggedActivationResult =
  | Exclude<ActivationResult, { kind: "ok" }>
  | (Extract<ActivationResult, { kind: "ok" }> & { sequence: number });

const activatedEvent = (
  activationId: string,
  scenarioId: string,
): NewIncidentEvent => ({
  type: "SCENARIO_ACTIVATED",
  schemaVersion: 1,
  subject: { type: "activation", id: activationId },
  activationId,
  payload: { scenarioId },
});

const stoodDownEvent = (
  activationId: string,
  scenarioId: string,
): NewIncidentEvent => ({
  type: "SCENARIO_STOOD_DOWN",
  schemaVersion: 1,
  subject: { type: "activation", id: activationId },
  activationId,
  payload: { scenarioId },
});

let queue: Promise<unknown> = Promise.resolve();

function oneAtATime<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => {});
  return run;
}

// Activates the scenario and writes its SCENARIO_ACTIVATED event. The activation
// is in memory, so it can't join the database transaction. Instead it is taken
// back if the event does not commit, so the two never diverge. A refused
// activation writes no event.

export function activateAndLog(
  user: AuthUser,
  scenario: Scenario,
  username: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<LoggedActivationResult> {
  return oneAtATime(async () => {
    const result = activateScenario(scenario, username);
    if (result.kind !== "ok") return result;

    const { activationId } = result.activation;
    let sequence: number;
    try {
      const event = await getDatabase().begin((tx) =>
        writeEvent(tx, user, activatedEvent(activationId, scenario.scenarioId)),
      );
      sequence = Number(event.sequence);
    } catch (error) {
      undoActivation(activationId);
      throw error;
    }
    setActivationSequence(activationId, sequence);
    return { ...result, sequence };
  });
}

// Stands down the activation and writes its SCENARIO_STOOD_DOWN event.

export function standDownAndLog(
  user: AuthUser,
  activationId: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<StandDownResult> {
  return oneAtATime(async () => {
    const result = closeActivation(activationId);
    if (result.kind !== "ok") return result;
    try {
      await getDatabase().begin((tx) =>
        writeEvent(
          tx,
          user,
          stoodDownEvent(activationId, result.activation.scenarioId),
        ),
      );
    } catch (error) {
      reopenActivation(activationId);
      throw error;
    }
    return result;
  });
}

export type SwitchResult =
  LoggedActivationResult | { kind: "replaces-not-active" };

// Switches from the active scenario to another one. The old
// one is stood down first, so only one is ever active. Both events are written
// in one transaction; if it fails, both in-memory changes are taken back.

export function switchAndLog(
  user: AuthUser,
  scenario: Scenario,
  username: string,
  replaces: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<SwitchResult> {
  return oneAtATime(async () => {
    const [active] = listActivations("ACTIVE");
    if (active?.activationId !== replaces) {
      return { kind: "replaces-not-active" };
    }

    closeActivation(replaces);
    const result = activateScenario(scenario, username);
    if (result.kind !== "ok") {
      reopenActivation(replaces);
      return result;
    }

    const { activationId } = result.activation;
    let sequence: number;
    try {
      const event = await getDatabase().begin(async (tx) => {
        await writeEvent(tx, user, stoodDownEvent(replaces, active.scenarioId));
        return writeEvent(
          tx,
          user,
          activatedEvent(activationId, scenario.scenarioId),
        );
      });
      sequence = Number(event.sequence);
    } catch (error) {
      undoActivation(activationId);
      reopenActivation(replaces);
      throw error;
    }
    setActivationSequence(activationId, sequence);
    return { ...result, sequence };
  });
}
