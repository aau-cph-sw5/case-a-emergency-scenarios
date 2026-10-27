import type { ScenarioState } from "../../shared/types/v1/scenario-state";

// Checks the required fields of contracts/v1/scenario-state.schema.json that
// the client reads. The server validates the rest against the contract.
export function isScenarioState(data: unknown): data is ScenarioState {
  const state = data as Partial<ScenarioState> | null;
  return (
    typeof state?.activationId === "string" &&
    typeof state.scenarioId === "string" &&
    (state.status === "ACTIVE" || state.status === "CLOSED") &&
    typeof state.actor === "string" &&
    typeof state.startedAt === "string" &&
    Array.isArray(state.deployments)
  );
}
