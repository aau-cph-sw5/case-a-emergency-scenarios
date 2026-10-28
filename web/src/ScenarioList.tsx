import { useEffect, useRef, useState } from "react";
import { colors } from "../../shared/Theme";
import { useLiveData } from "./data/liveData";
import { filterScenarios } from "./filter-scenarios";
import { postJson, userMessage } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";
import type { ScenarioSummary } from "./scenarios";
import { canActivate, keepSelection } from "./selection";

type ActivationState =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "error"; message: string }
  | { status: "done"; state: ScenarioState };

// The list does not keep the selection itself. OperatorDashboard holds it and
// passes it in, so the scenario preview next to the list shows the same
// scenario that is selected here.
export function ScenarioList({
  token,
  selectedId,
  onSelect,
  onActivated,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (scenarioId: string | null) => void;
  onActivated: (scenarioId: string) => void;
}) {
  // The scenario list and the active activations come from LiveDataProvider,
  // which loads them once and reloads the activations when they change.
  const { scenarios, scenariosError, reloadScenarios, activations, error } =
    useLiveData();
  const [query, setQuery] = useState("");
  // True while the confirmation dialog is open for the selected scenario.
  const [confirming, setConfirming] = useState(false);
  const [activation, setActivation] = useState<ActivationState>({
    status: "idle",
  });
  // The scenarios that are already active. A scenario activated here counts
  // as active straight away, so the operator cannot try to activate it again
  // before the reloaded activations arrive.
  const activeIds = new Set(activations.map((a) => a.scenarioId));
  if (activation.status === "done") activeIds.add(activation.state.scenarioId);
  // If the active scenarios cannot be loaded, the operator can still find and
  // activate scenarios, and a message says that they could not be shown.
  const activeFailed = error !== null;

  // Clear the selection if the selected scenario is no longer in the list.
  useEffect(() => {
    if (scenarios === null) return;
    const kept = keepSelection(selectedId, scenarios);
    if (kept !== selectedId) onSelect(kept);
  }, [scenarios, selectedId, onSelect]);

  const selected =
    scenarios?.find((scenario) => scenario.scenarioId === selectedId) ?? null;

  async function activate(scenario: ScenarioSummary) {
    setConfirming(false);
    setActivation({ status: "activating" });
    try {
      const state = await postJson(
        `/api/v1/scenarios/${encodeURIComponent(scenario.scenarioId)}/activate`,
        token,
        isScenarioState,
      );
      setActivation({ status: "done", state });
      onActivated(state.scenarioId);
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

      {scenarios === null && scenariosError === null && (
        <p role="status">Henter scenarier…</p>
      )}

      {scenariosError !== null && (
        <>
          <p role="alert">Kunne ikke hente scenarier: {scenariosError}</p>
          <button type="button" onClick={reloadScenarios}>
            Prøv igen
          </button>
        </>
      )}

      {scenarios !== null &&
        (scenarios.length === 0 ? (
          <p role="status">Ingen scenarier tilgængelige.</p>
        ) : (
          <ScenarioResults
            scenarios={filterScenarios(scenarios, query)}
            query={query}
            selectedId={selectedId}
            activeIds={activeIds}
            onSelect={onSelect}
            disabled={activation.status === "activating"}
          />
        ))}

      {activeFailed && <p role="status">Aktive scenarier kunne ikke vises.</p>}

      {/* Opens the existing confirmation for the selected scenario. It sits
          under the list for now; it belongs at the bottom of the scenario
          preview, so the operator sees what a scenario requires before
          activating it. */}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={
          !canActivate(
            selected?.scenarioId ?? null,
            activation.status === "activating",
            activeIds,
          )
        }
      >
        Aktivér valgt scenarie
      </button>

      {confirming && selected && (
        <ConfirmActivation
          scenario={selected}
          onConfirm={() => activate(selected)}
          onCancel={() => setConfirming(false)}
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

const selectedStyle = {
  backgroundColor: colors.active,
  color: colors.textInverse,
  fontWeight: "bold",
} as const;

function ScenarioResults({
  scenarios,
  query,
  selectedId,
  activeIds,
  onSelect,
  disabled,
}: {
  scenarios: ScenarioSummary[];
  query: string;
  selectedId: string | null;
  activeIds: ReadonlySet<string>;
  onSelect: (scenarioId: string) => void;
  disabled: boolean;
}) {
  // No match is an empty list, not an error.
  if (scenarios.length === 0) {
    return <p role="status">Ingen scenarier matcher “{query.trim()}”.</p>;
  }
  return (
    <ul>
      {scenarios.map((scenario) => {
        const isSelected = scenario.scenarioId === selectedId;
        // The selected scenario is inverted, the shared "selected" style in
        // Theme, and bold, so it is marked by more than colour. aria-pressed
        // tells screen readers which one is selected.
        return (
          <li key={scenario.scenarioId}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(scenario.scenarioId)}
              disabled={disabled}
              style={isSelected ? selectedStyle : undefined}
            >
              {scenario.name}
              {/* Text, so an active scenario is not marked by colour alone. */}
              {activeIds.has(scenario.scenarioId) && " — Aktiv"}
            </button>
          </li>
        );
      })}
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
