import { getJson } from "../../../shared/api/http";
import type { ScenarioActivated } from "../../../shared/socket/events";
import type { Scenario } from "../../../shared/types/v1/scenario";
import type { ScenarioState } from "../../../shared/types/v1/scenario-state";
import { apiBaseUrl } from "../api-base-url";

type NumberedState = ScenarioState & { sequence: number };

// The server answers null while no scenario is active.
function isNumberedStateOrNull(data: unknown): data is NumberedState | null {
  if (data === null) return true;
  const state = data as Partial<ScenarioState>;
  return (
    typeof state.scenarioId === "string" && typeof state.sequence === "number"
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
  const state = await getJson(
    apiBaseUrl,
    "/api/v1/scenario-state",
    token,
    isNumberedStateOrNull,
  );
  if (state === null) return null;
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
