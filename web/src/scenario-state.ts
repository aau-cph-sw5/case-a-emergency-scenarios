import type { ScenarioState } from "../../shared/types/v1/scenario-state";

// Checks the fields of contracts/v1/scenario-state.schema.json the client reads.
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
