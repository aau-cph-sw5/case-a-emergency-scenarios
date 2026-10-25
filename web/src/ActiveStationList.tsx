import { useEffect, useState } from "react";
import ScenarioStationList from "../../shared/components/stationView";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { getJson, userMessage } from "./get-json";

function isScenario(data: unknown): data is Scenario {
  const scenario = data as Partial<Scenario> | null;
  return (
    typeof scenario?.scenarioId === "string" &&
    typeof scenario.currentVersion === "string" &&
    Array.isArray(scenario.versions)
  );
}

// The stations of the active scenario and who covers them. The caller keys it
// by scenarioId, so a new scenario starts from a clean state.
export function ActiveStationList({
  token,
  activation,
}: {
  token: string;
  activation: ScenarioState;
}) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { scenarioId } = activation;

  useEffect(() => {
    const controller = new AbortController();
    getJson(
      `/api/v1/scenarios/${encodeURIComponent(scenarioId)}`,
      isScenario,
      controller.signal,
    ).then(setScenario, (e: unknown) => {
      if (controller.signal.aborted) return;
      console.error(e);
      setError(userMessage(e));
    });
    return () => controller.abort();
  }, [token, scenarioId]);

  if (error !== null) return <p role="alert">{error}</p>;
  if (scenario === null) return <p>Henter stationer…</p>;
  return (
    <ScenarioStationList scenario={scenario} activeDeployments={activation} />
  );
}
