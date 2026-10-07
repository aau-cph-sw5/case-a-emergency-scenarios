import { useEffect, useState } from "react";
import { api, type ScenarioSummary } from "./api";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; scenarios: ScenarioSummary[] };

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    api
      .fetchScenarios()
      .then((scenarios) => {
        if (!cancelled) setState({ status: "ready", scenarios });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Emergency Scenarios</h1>

      {state.status === "loading" && <p>Loading scenarios…</p>}

      {state.status === "error" && (
        <p role="alert">
          Could not load scenarios: {state.message}. Is the server running (
          <code>npm run stub</code>)?
        </p>
      )}

      {state.status === "ready" && (
        <ul>
          {state.scenarios.map((scenario) => (
            <li key={scenario.scenarioId}>
              <strong>{scenario.scenarioId}</strong> {scenario.name} (version{" "}
              {scenario.currentVersion})
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
