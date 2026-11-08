import { useCallback, useEffect, useRef, useState } from "react";
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
  retry: () => void;
} {
  const { live, loadScenario } = useLiveContext();
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setResult(null);
    setAttempt((value) => value + 1);
  }, []);

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
  }, [scenarioId, loadScenario, attempt]);

  // A scenario that failed to load while the connection was down is loaded
  // again once it is back, so the map zooms in and the preview fills in
  // without the operator choosing the scenario again (#310). Only after the
  // connection has been down, so a scenario the server refuses is not asked
  // for over and over. A request that times out only after the connection is
  // back counts too, since the drop is remembered until the next attempt.
  const failed =
    result !== null && "error" in result && result.scenarioId === scenarioId;
  const droppedSinceAttemptRef = useRef(false);
  useEffect(() => {
    if (!live.isConnected) {
      droppedSinceAttemptRef.current = true;
      return;
    }
    if (failed && droppedSinceAttemptRef.current) {
      droppedSinceAttemptRef.current = false;
      retry();
    }
  }, [live.isConnected, failed, retry]);

  if (scenarioId === null) {
    return { scenario: null, isLoading: false, error: null, retry };
  }
  // The result still belongs to the previous id until the new answer arrives.
  if (result === null || result.scenarioId !== scenarioId) {
    return { scenario: null, isLoading: true, error: null, retry };
  }
  return "scenario" in result
    ? { scenario: result.scenario, isLoading: false, error: null, retry }
    : { scenario: null, isLoading: false, error: result.error, retry };
}
