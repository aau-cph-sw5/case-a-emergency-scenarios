import { useEffect, useState } from "react";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { fetchActiveActivations } from "./activations";
import { userMessage } from "./get-json";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";
import { socket } from "./socket";

// The active activations and the scenario names, loaded once in App and shared
// by the banner and the dashboard. The socket says when to load again.
export function useActiveActivations(token: string) {
  const [active, setActive] = useState<ScenarioState[]>([]);
  const [names, setNames] = useState<Map<string, ScenarioSummary>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    // Only the newest load may set state, so a slow older one cannot
    // overwrite a newer answer.
    let latest = 0;
    async function load() {
      const mine = ++latest;
      try {
        const [activations, scenarios] = await Promise.all([
          fetchActiveActivations(token, controller.signal),
          fetchScenarios(token, controller.signal),
        ]);
        if (mine !== latest) return;
        setNames(new Map(scenarios.map((s) => [s.scenarioId, s])));
        setActive(activations);
        setError(null);
        setLoading(false);
      } catch (e) {
        if (controller.signal.aborted || mine !== latest) return;
        console.error(e);
        setError(userMessage(e));
        setLoading(false);
      }
    }
    // App opens the socket. "connect" also fires on a reconnect, which catches up on missed events.
    socket.on("connect", load);
    socket.on("activations-changed", load);
    load();
    return () => {
      controller.abort();
      socket.off("connect", load);
      socket.off("activations-changed", load);
    };
  }, [token]);

  return { active, names, error, loading };
}

export type ActiveActivations = ReturnType<typeof useActiveActivations>;
