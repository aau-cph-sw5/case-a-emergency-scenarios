// The fields of contracts/v1/scenario-state.schema.json the client shows.
export type ScenarioState = {
  scenarioId: string;
  status: "ACTIVE" | "CLOSED";
  actor: string;
  startedAt: string;
};

export function isScenarioState(data: unknown): data is ScenarioState {
  const state = data as Partial<ScenarioState> | null;
  return (
    typeof state?.scenarioId === "string" &&
    (state.status === "ACTIVE" || state.status === "CLOSED") &&
    typeof state.actor === "string" &&
    typeof state.startedAt === "string"
  );
}
