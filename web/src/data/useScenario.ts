import { useEffect, useState } from "react";
import type { Scenario } from "../../../shared/types/v1/scenario";
import { userMessage } from "../get-json";
import { useLiveContext } from "./liveData";

type Result =
  | { scenarioId: string; scenario: Scenario }
  | { scenarioId: string; error: string };

// One scenario with all its versions, for example the selected one in the
// preview. Pass null when nothing is selected. The request is shared with
// every other component asking for the same id (see loadScenario).
export function useScenario(scenarioId: string | null): {
  scenario: Scenario | null;
  isLoading: boolean;
  error: string | null;
} {
  const { loadScenario } = useLiveContext();
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (scenarioId === null) return;
    // False once the id changes or the component goes away, so an answer for
    // a scenario the operator has left is never set.
    let wanted = true;
    loadScenario(scenarioId).then(
      (scenario) => {
        if (wanted) setResult({ scenarioId, scenario });
      },
      (e: unknown) => {
        if (!wanted) return;
        console.error(e);
        setResult({ scenarioId, error: userMessage(e) });
      },
    );
    return () => {
      wanted = false;
    };
  }, [scenarioId, loadScenario]);

  if (scenarioId === null) {
    return { scenario: null, isLoading: false, error: null };
  }
  // The result still belongs to the previous id until the new answer arrives.
  if (result === null || result.scenarioId !== scenarioId) {
    return { scenario: null, isLoading: true, error: null };
  }
  return "scenario" in result
    ? { scenario: result.scenario, isLoading: false, error: null }
    : { scenario: null, isLoading: false, error: result.error };
}
