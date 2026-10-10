import { useEffect, useState } from "react";
import { filterScenarios } from "./filter-scenarios";

// The fields of contracts/v1/scenario-list.schema.json this list uses.
type ScenarioSummary = {
  scenarioId: string;
  name: string;
};

const REQUEST_TIMEOUT_MS = 10_000;

function isScenarioList(data: unknown): data is ScenarioSummary[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item?.scenarioId === "string" && typeof item?.name === "string",
    )
  );
}

// vite.config forwards /api to the server
async function fetchScenarios(signal: AbortSignal): Promise<ScenarioSummary[]> {
  let response: Response;
  try {
    response = await fetch("/api/v1/scenarios", {
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        `no answer from the server within ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        { cause: error },
      );
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(`GET /api/v1/scenarios failed with ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!isScenarioList(data)) {
    throw new Error("the server sent a scenario list in an unexpected format");
  }
  return data;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; scenarios: ScenarioSummary[] };

export function ScenarioList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchScenarios(controller.signal).then(
      (scenarios) => setState({ status: "done", scenarios }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
    return () => controller.abort();
  }, []);

  // The search field is always shown, so it is there whenever the list is
  // longer than one screen (MET-A-007, criterion 1).
  return (
    <section aria-labelledby="scenario-list-heading">
      <h2 id="scenario-list-heading">Scenarios</h2>

      <label>
        Search scenarios{" "}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {state.status === "loading" && <p role="status">Loading scenarios…</p>}

      {state.status === "error" && (
        <p role="alert">Could not load scenarios: {state.message}</p>
      )}

      {state.status === "done" &&
        (state.scenarios.length === 0 ? (
          <p role="status">No scenarios available.</p>
        ) : (
          <ScenarioResults
            scenarios={filterScenarios(state.scenarios, query)}
            query={query}
          />
        ))}
    </section>
  );
}

function ScenarioResults({
  scenarios,
  query,
}: {
  scenarios: ScenarioSummary[];
  query: string;
}) {
  // No match is an empty list, not an error.
  if (scenarios.length === 0) {
    return <p role="status">No scenarios match “{query.trim()}”.</p>;
  }
  return (
    <ul>
      {scenarios.map((scenario) => (
        <li key={scenario.scenarioId}>{scenario.name}</li>
      ))}
    </ul>
  );
}
