import { useEffect, useRef, useState } from "react";
import { colors } from "../../shared/Theme";
import { fetchActiveScenarioIds } from "./activations";
import { filterScenarios } from "./filter-scenarios";
import { postJson, userMessage } from "./get-json";
import { isScenarioState, type ScenarioState } from "./scenario-state";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";
import { canActivate, keepSelection } from "./selection";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; scenarios: ScenarioSummary[] };

type ActivationState =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "error"; message: string }
  | { status: "done"; state: ScenarioState };

// The selection is held by OperatorDashboard, so the preview (#202) reads the
// same selected scenario as this list.
export function ScenarioList({
  token,
  selectedId,
  onSelect,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (scenarioId: string | null) => void;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  // True while the confirmation dialog is open for the selected scenario.
  const [confirming, setConfirming] = useState(false);
  const [activation, setActivation] = useState<ActivationState>({
    status: "idle",
  });
  // The scenarios that are already active, and whether loading them failed.
  const [activeIds, setActiveIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [activeFailed, setActiveFailed] = useState(false);

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

  // Loaded separately from the scenarios, so the list still works when the
  // activations cannot be loaded (#182).
  useEffect(() => {
    const controller = new AbortController();
    fetchActiveScenarioIds(token, controller.signal).then(
      (ids) => {
        setActiveIds(ids);
        setActiveFailed(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setActiveFailed(true);
      },
    );
    return () => controller.abort();
  }, [token]);

  // Clear the selection if the selected scenario is no longer in the list.
  useEffect(() => {
    if (state.status !== "done") return;
    const kept = keepSelection(selectedId, state.scenarios);
    if (kept !== selectedId) onSelect(kept);
  }, [state, selectedId, onSelect]);

  const selected =
    state.status === "done"
      ? (state.scenarios.find(
          (scenario) => scenario.scenarioId === selectedId,
        ) ?? null)
      : null;

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
      // Mark it active at once, without reloading the page (#182).
      setActiveIds((ids) => new Set(ids).add(state.scenarioId));
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
            selectedId={selectedId}
            activeIds={activeIds}
            onSelect={onSelect}
            disabled={activation.status === "activating"}
          />
        ))}

      {activeFailed && <p role="status">Aktive scenarier kunne ikke vises.</p>}

      {/* Opens the existing confirmation for the selected scenario. #202 moves
          this button to the bottom of the preview. */}
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
