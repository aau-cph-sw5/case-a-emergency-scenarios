import { getDatabase } from "../db/client.js";
import {
  activateScenario,
  setActivationSequence,
  undoActivation,
  type ActivationResult,
} from "../repositories/fixture-repository.js";
import type { Scenario } from "../../shared/types/v1/scenario.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;

// A successful activation also carries its event's sequence.
export type LoggedActivationResult =
  | Exclude<ActivationResult, { kind: "ok" }>
  | (Extract<ActivationResult, { kind: "ok" }> & { sequence: number });

// Activates the scenario and writes its SCENARIO_ACTIVATED event. The activation
// is in memory, so it can't join the database transaction. Instead it is taken
// back if the event does not commit, so the two never diverge. A refused
// activation writes no event.
export async function activateAndLog(
  user: AuthUser,
  scenario: Scenario,
  username: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<LoggedActivationResult> {
  const result = activateScenario(scenario, username);
  if (result.kind !== "ok") return result;

  const { activationId } = result.activation;
  let sequence: number;
  try {
    const event = await getDatabase().begin((tx) =>
      writeEvent(tx, user, {
        type: "SCENARIO_ACTIVATED",
        schemaVersion: 1,
        subject: { type: "activation", id: activationId },
        activationId,
        payload: { scenarioId: scenario.scenarioId },
      }),
    );
    sequence = Number(event.sequence);
  } catch (error) {
    undoActivation(activationId);
    throw error;
  }
  setActivationSequence(activationId, sequence);
  return { ...result, sequence };
}
