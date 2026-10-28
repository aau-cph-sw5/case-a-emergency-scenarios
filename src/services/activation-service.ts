import { getDatabase } from "../db/client.js";
import {
  activateScenario,
  undoLastActivation,
  type ActivationResult,
} from "../repositories/fixture-repository.js";
import type { Scenario } from "../../shared/types/v1/scenario.js";
import type { AuthUser } from "./auth-service.js";
import { appendEvent } from "./incident-log-service.js";

// Lets a test replace the event write with one that fails.
type WriteEvent = typeof appendEvent;

// Activates the scenario and writes its SCENARIO_ACTIVATED event. The activation
// is in memory, so it can't join the database transaction. Instead it is taken
// back if the event does not commit, so the two never diverge. A refused
// activation writes no event.
export async function activateAndLog(
  user: AuthUser,
  scenario: Scenario,
  username: string,
  writeEvent: WriteEvent = appendEvent,
): Promise<ActivationResult> {
  const result = activateScenario(scenario, username);
  if (result.kind !== "ok") return result;

  const { activationId } = result.activation;
  try {
    await getDatabase().begin((tx) =>
      writeEvent(tx, user, {
        type: "SCENARIO_ACTIVATED",
        schemaVersion: 1,
        subject: { type: "activation", id: activationId },
        activationId,
        payload: { scenarioId: scenario.scenarioId },
      }),
    );
  } catch (error) {
    // Safe: while this activation is active, no other can be added after it.
    undoLastActivation();
    throw error;
  }
  return result;
}
