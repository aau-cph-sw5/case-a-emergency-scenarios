import { useEffect, useRef, useState, type ReactNode } from "react";
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
  | { status: "standing-down" }
  | { status: "error"; message: string }
  | { status: "done"; state: ScenarioState }
  | { status: "stood-down"; state: ScenarioState };

// The list does not keep the selection itself. OperatorDashboard holds it and
// passes it in, so the scenario preview next to the list shows the same
// scenario that is selected here.
export function ScenarioList({
  token,
  selectedId,
  onSelect,
  onActivated,
  previewReady = true,
  summary,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (scenarioId: string | null) => void;
  onActivated: (scenarioId: string) => void;
  previewReady?: boolean;
  summary?: ReactNode;
}) {
  // The scenario list and the active activations come from LiveDataProvider,
  // which loads them once and reloads the activations when they change.
  const { scenarios, scenariosError, reloadScenarios, activations, error } =
    useLiveData();
  const [query, setQuery] = useState("");
  const [switchPhase, setSwitchPhase] = useState<"closed" | "open" | "closing">(
    "closed",
  );
  const switching = switchPhase !== "closed";
  // True while the confirmation dialog is open for the selected scenario.
  const [confirming, setConfirming] = useState(false);
  // Names for the scenarios being deactivated, shown in the confirmation.
  const names = new Map((scenarios ?? []).map((s) => [s.scenarioId, s.name]));
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
  // Selecting the active scenario offers to stand it down instead.
  const selectedIsActive =
    selected !== null && activeIds.has(selected.scenarioId);
  // Keep STOP available after a reload, even when no list item is selected.
  const activeScenario = activations.at(-1);
  const actionScenario =
    activeScenario && !switching
      ? {
          scenarioId: activeScenario.scenarioId,
          name:
            names.get(activeScenario.scenarioId) ?? activeScenario.scenarioId,
        }
      : selected;
  const actionIsActive =
    !switching && (activeScenario !== undefined || selectedIsActive);
  const choosingScenario = activeScenario === undefined || switching;
  // No new action is started while one is on its way to the server.
  const busy =
    activation.status === "activating" ||
    activation.status === "standing-down" ||
    switchPhase === "closing";

  const activeScenarioId = activeScenario?.scenarioId ?? null;
  // Keep the picker mounted until the exit animation finishes. The timeout
  // also completes cancellation if animations are disabled outside our CSS.
  useEffect(() => {
    if (switchPhase !== "closing") return;
    const timer = setTimeout(() => {
      setSwitchPhase("closed");
      onSelect(activeScenarioId);
    }, 350);
    return () => clearTimeout(timer);
  }, [switchPhase, activeScenarioId, onSelect]);

  function finishSwitch() {
    setSwitchPhase("closed");
    onSelect(activeScenarioId);
  }

  async function activate(scenario: ScenarioSummary) {
    setConfirming(false);
    if (!previewReady || !canActivate(scenario.scenarioId, busy, activeIds))
      return;
    setActivation({ status: "activating" });
    // While another scenario is active this is a switch: replaces names the
    // activation the operator confirmed to stand down
    const outgoing = activations.find(
      (a) => a.scenarioId !== scenario.scenarioId,
    );
    try {
      const state = await postJson(
        `/api/v1/scenarios/${encodeURIComponent(scenario.scenarioId)}/activate`,
        token,
        isScenarioState,
        outgoing && { replaces: outgoing.activationId },
      );
      setActivation({ status: "done", state });
      setSwitchPhase("closed");
      onSelect(state.scenarioId);
      onActivated(state.scenarioId);
    } catch (error) {
      console.error(error);
      setActivation({
        status: "error",
        message: `Kunne ikke aktivere scenariet: ${userMessage(error)}`,
      });
    }
  }

  // The server sends "activations-changed" afterwards, so the dot and the
  // banner update by themselves
  async function standDown(scenario: ScenarioSummary) {
    setConfirming(false);
    const active = activations.find(
      (a) => a.scenarioId === scenario.scenarioId,
    );
    if (active === undefined) return;
    setActivation({ status: "standing-down" });
    try {
      const state = await postJson(
        `/api/v1/activations/${active.activationId}/stand-down`,
        token,
        isScenarioState,
      );
      setActivation({ status: "stood-down", state });
      // The map returns to the default map that it shows at the start.
      onSelect(null);
    } catch (error) {
      console.error(error);
      setActivation({
        status: "error",
        message: `Kunne ikke deaktivere scenariet: ${userMessage(error)}`,
      });
    }
  }

  // An active scenario uses this space for its live metrics instead of search.
  return (
    <section
      className={`scenario-selection${!choosingScenario ? " scenario-selection--active" : ""}${switching ? " scenario-selection--switching" : ""}${switchPhase === "closing" ? " is-closing" : ""}`}
      aria-label="Scenarier og handlinger"
    >
      <div
        className="scenario-picker"
        hidden={!choosingScenario}
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "scenario-picker-out" &&
            switchPhase === "closing"
          )
            finishSwitch();
        }}
      >
        <h2 id="scenario-list-heading">Vælg scenarie</h2>

        <label>
          <span className="visually-hidden">Søg efter scenarier</span>
          <input
            type="search"
            placeholder="Søg efter scenarie"
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
              disabled={busy}
            />
          ))}

        {activeFailed && (
          <p role="status">Aktive scenarier kunne ikke vises.</p>
        )}
      </div>
      {summary && !switching && (
        <div className="operator-summaries">{summary}</div>
      )}

      {/* Switching previews another scenario without stopping the current one. */}
      <div className="scenario-actions">
        {actionIsActive && activeScenario && (
          <button
            type="button"
            className="scenario-switch"
            disabled={busy}
            onClick={() => {
              setSwitchPhase("open");
              setQuery("");
              onSelect(null);
            }}
          >
            Skift scenarie
          </button>
        )}
        {!actionIsActive && (
          <button
            type="button"
            className="scenario-cancel"
            disabled={busy || (!switching && selectedId === null)}
            onClick={() => {
              if (switching) {
                if (
                  window.matchMedia?.("(prefers-reduced-motion: reduce)")
                    .matches
                )
                  finishSwitch();
                else setSwitchPhase("closing");
              } else onSelect(null);
            }}
          >
            Annuller
          </button>
        )}
        {actionIsActive ? (
          <button
            type="button"
            className="scenario-stop"
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            Annuller scenarie
          </button>
        ) : (
          <button
            type="button"
            className="scenario-start"
            onClick={() => setConfirming(true)}
            disabled={
              !previewReady ||
              !canActivate(selected?.scenarioId ?? null, busy, activeIds)
            }
          >
            Aktivér valgt scenarie
          </button>
        )}
      </div>

      {confirming &&
        actionScenario &&
        (actionIsActive ? (
          <ConfirmStandDown
            scenario={actionScenario}
            onConfirm={() => standDown(actionScenario)}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <ConfirmActivation
            scenario={actionScenario}
            outgoing={activations
              .filter((a) => a.scenarioId !== actionScenario.scenarioId)
              .map((a) => names.get(a.scenarioId) ?? a.scenarioId)}
            onConfirm={() => activate(actionScenario)}
            onCancel={() => setConfirming(false)}
          />
        ))}

      <ActivationStatus activation={activation} />
    </section>
  );
}

function ActivationStatus({ activation }: { activation: ActivationState }) {
  switch (activation.status) {
    case "activating":
      return (
        <p className="visually-hidden" role="status">
          Aktiverer scenarie.
        </p>
      );
    case "standing-down":
      return (
        <p className="visually-hidden" role="status">
          Deaktiverer scenarie.
        </p>
      );
    case "error":
      return <p role="alert">{activation.message}</p>;
    default:
      return null;
  }
}

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
    <ul className="scenario-list">
      {scenarios.map((scenario) => {
        const isSelected = scenario.scenarioId === selectedId;
        const live = activeIds.has(scenario.scenarioId);
        // The yellow background and bold text mark the selection;
        // aria-pressed also exposes it to screen readers.
        return (
          <li key={scenario.scenarioId}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(scenario.scenarioId)}
              disabled={disabled}
              className={
                isSelected ? "scenario-option is-selected" : "scenario-option"
              }
            >
              {scenario.name}
            </button>
            {/* A filled green dot when the scenario is live and an empty ring
                when it is not, so it is marked by shape as well as colour. */}
            <span
              className={
                live ? "scenario-dot scenario-dot--live" : "scenario-dot"
              }
              role="img"
              aria-label={live ? "Aktiv" : "Ikke aktiv"}
              title={live ? "Aktiv" : "Ikke aktiv"}
            />
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
  outgoing,
  onConfirm,
  onCancel,
}: {
  scenario: ScenarioSummary;
  outgoing: string[];
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
      className="operator-confirm"
      onClose={onCancel}
      aria-labelledby="confirm-activation-heading"
    >
      <h3 id="confirm-activation-heading">
        {outgoing.length > 0
          ? `Er du sikker på, at du vil skifte fra ${outgoing.map((name) => `“${name}”`).join(", ")} til “${scenario.name}”?`
          : `Aktivér “${scenario.name}”?`}
      </h3>
      <div className="confirm-actions">
        <button
          type="button"
          className="confirm-cancel"
          onClick={() => dialogRef.current?.close()}
        >
          Annullér
        </button>
        <button type="button" className="confirm-accept" onClick={onConfirm}>
          Bekræft
        </button>
      </div>
    </dialog>
  );
}

// Confirm Standing down the active scenario.
function ConfirmStandDown({
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
      className="operator-confirm"
      onClose={onCancel}
      aria-labelledby="confirm-stand-down-heading"
    >
      <h3 id="confirm-stand-down-heading" className="confirm-warning">
        Vil du deaktivere “{scenario.name}”?
      </h3>
      <div className="confirm-actions">
        <button
          type="button"
          className="confirm-cancel"
          onClick={() => dialogRef.current?.close()}
        >
          Annullér
        </button>
        <button type="button" className="confirm-accept" onClick={onConfirm}>
          Deaktivér
        </button>
      </div>
    </dialog>
  );
}
