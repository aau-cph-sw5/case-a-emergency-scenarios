import { useEffect, useRef, useState } from "react";
import { filterScenarios } from "./filter-scenarios";
import { postJson, userMessage } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";
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
    fetchScenarios(token, controller.signal).then(
      (scenarios) => setState({ status: "done", scenarios }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ status: "error", message: userMessage(error) });
      },
    );
    return () => controller.abort();
  }, [token]);

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
      console.error(error);
      setActivation({ status: "error", message: userMessage(error) });
    }
  }

  // The search field is always shown, so it is there whenever the list is
  // longer than one screen (MET-A-007 criterion 1 / #116 criterion 3).
  return (
    <section aria-labelledby="scenario-list-heading">
      <h2 id="scenario-list-heading">Nødscenarier</h2>

      <label>
        Søg efter scenarier{" "}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {state.status === "loading" && <p role="status">Henter scenarier…</p>}

      {state.status === "error" && (
        <p role="alert">Kunne ikke hente scenarier: {state.message}</p>
      )}

      {state.status === "done" &&
        (state.scenarios.length === 0 ? (
          <p role="status">Ingen scenarier tilgængelige.</p>
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
      return <p role="status">Aktiverer scenarie…</p>;
    case "error":
      return (
        <p role="alert">Kunne ikke aktivere scenariet: {activation.message}</p>
      );
    case "done":
      return (
        <p role="status">
          Scenarie {activation.state.scenarioId} er {activation.state.status},
          startet {activation.state.startedAt} af {activation.state.actor}.
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
    return <p role="status">Ingen scenarier matcher “{query.trim()}”.</p>;
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
      <h3 id="confirm-activation-heading">Aktivér “{scenario.name}”?</h3>
      <button type="button" onClick={onConfirm}>
        Bekræft
      </button>{" "}
      <button type="button" onClick={() => dialogRef.current?.close()}>
        Annullér
      </button>
    </dialog>
  );
}
