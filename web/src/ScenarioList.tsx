import { useEffect, useRef, useState } from "react";
import { filterScenarios } from "./filter-scenarios";
import { errorMessage, postJson } from "./get-json";
import { isScenarioState, type ScenarioState } from "./scenario-state";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; scenarios: ScenarioSummary[] };

type ActivationState =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "error"; message: string }
  | { status: "done"; state: ScenarioState };

export function ScenarioList({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ScenarioSummary | null>(null);
  const [activation, setActivation] = useState<ActivationState>({
    status: "idle",
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchScenarios(controller.signal).then(
      (scenarios) => setState({ status: "done", scenarios }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", message: errorMessage(error) });
      },
    );
    return () => controller.abort();
  }, []);

  async function activate(scenario: ScenarioSummary) {
    setSelected(null);
    setActivation({ status: "activating" });
    try {
      const state = await postJson(
        `/api/v1/scenarios/${encodeURIComponent(scenario.scenarioId)}/activate`,
        token,
        isScenarioState,
      );
      setActivation({ status: "done", state });
    } catch (error) {
      setActivation({ status: "error", message: errorMessage(error) });
    }
  }

  // The search field is always shown, so it is there whenever the list is
  // longer than one screen (MET-A-007 criterion 1 / #116 criterion 3).
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
            onSelect={setSelected}
            disabled={activation.status === "activating"}
          />
        ))}

      {selected && (
        <ConfirmActivation
          scenario={selected}
          onConfirm={() => activate(selected)}
          onCancel={() => setSelected(null)}
        />
      )}

      <ActivationStatus activation={activation} />
    </section>
  );
}

function ActivationStatus({ activation }: { activation: ActivationState }) {
  switch (activation.status) {
    case "idle":
      return null;
    case "activating":
      return <p role="status">Activating scenario…</p>;
    case "error":
      return (
        <p role="alert">
          Could not activate the scenario: {activation.message}
        </p>
      );
    case "done":
      return (
        <p role="status">
          Scenario {activation.state.scenarioId} is {activation.state.status},
          started {activation.state.startedAt} by {activation.state.actor}.
        </p>
      );
  }
}

function ScenarioResults({
  scenarios,
  query,
  onSelect,
  disabled,
}: {
  scenarios: ScenarioSummary[];
  query: string;
  onSelect: (scenario: ScenarioSummary) => void;
  disabled: boolean;
}) {
  // No match is an empty list, not an error.
  if (scenarios.length === 0) {
    return <p role="status">No scenarios match “{query.trim()}”.</p>;
  }
  return (
    <ul>
      {scenarios.map((scenario) => (
        <li key={scenario.scenarioId}>
          <button
            type="button"
            onClick={() => onSelect(scenario)}
            disabled={disabled}
          >
            {scenario.name}
          </button>
        </li>
      ))}
    </ul>
  );
}

// A native modal <dialog> traps focus and closes on Escape, which counts as
// Cancel. Nothing is activated unless Confirm is pressed (MET-A-007, criterion 2).
function ConfirmActivation({
  scenario,
  onConfirm,
  onCancel,
}: {
  scenario: ScenarioSummary;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      aria-labelledby="confirm-activation-heading"
    >
      <h3 id="confirm-activation-heading">Activate “{scenario.name}”?</h3>
      <button type="button" onClick={onConfirm}>
        Confirm
      </button>{" "}
      <button type="button" onClick={() => dialogRef.current?.close()}>
        Cancel
      </button>
    </dialog>
  );
}
