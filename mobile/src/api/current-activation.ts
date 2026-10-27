import { getJson, HttpError } from "../../../shared/api/http";
import type { ScenarioActivated } from "../../../shared/socket/events";
import type { Scenario } from "../../../shared/types/v1/scenario";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { apiBaseUrl } from "../api-base-url";

function isNumberedState(
  data: unknown,
): data is ScenarioState & { sequence: number } {
  const state = data as Partial<ScenarioState> | null;
  return (
    typeof state?.scenarioId === "string" && typeof state.sequence === "number"
  );
}

function isScenario(data: unknown): data is Scenario {
  const scenario = data as Partial<Scenario> | null;
  return (
    typeof scenario?.scenarioId === "string" &&
    typeof scenario.currentVersion === "string" &&
    Array.isArray(scenario.versions)
  );
}

export async function fetchCurrentActivation(
  token: string,
): Promise<ScenarioActivated | null> {
  let state: ScenarioState & { sequence: number };
  try {
    state = await getJson(
      apiBaseUrl,
      "/api/v1/scenario-state",
      token,
      isNumberedState,
    );
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
  const scenario = await getJson(
    apiBaseUrl,
    `/api/v1/scenarios/${encodeURIComponent(state.scenarioId)}`,
    token,
    isScenario,
  );
  return {
    scenario,
    sentAt: new Date().toISOString(),
    sequence: state.sequence,
  };
}
