import { useEffect, useRef, useState } from "react";
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
  | {
      status: "done";
      state: ScenarioState;
      previousActivations: ScenarioState[];
    }
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
}: {
  token: string;
  selectedId: string | null;
  onSelect: (scenarioId: string | null) => void;
  onActivated: (scenarioId: string) => void;
  previewReady?: boolean;
}) {
  // The scenario list and the active activations come from LiveDataProvider,
  // which loads them once and reloads the activations when they change.
  const { scenarios, scenariosError, reloadScenarios, activations, error } =
    useLiveData();
  const [query, setQuery] = useState("");
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
  const displayActivation: ActivationState =
    activation.status === "done" &&
    activation.previousActivations !== activations
      ? { status: "idle" }
      : activation;
  if (displayActivation.status === "done")
    activeIds.add(displayActivation.state.scenarioId);
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
  // No new action is started while one is on its way to the server.
  const busy =
    activation.status === "activating" || activation.status === "standing-down";

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
      setActivation({
        status: "done",
        state,
        previousActivations: activations,
      });
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

  // The search field is always shown, so it is there whenever the list is
  // longer than one screen (MET-A-007 criterion 1 / #116 criterion 3).
  return (
    <section
      className="scenario-selection"
      aria-labelledby="scenario-list-heading"
    >
      <h2 id="scenario-list-heading">Nødscenarier</h2>

      <label>
        Søg efter scenarier{" "}
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

      {activeFailed && <p role="status">Aktive scenarier kunne ikke vises.</p>}

      {/* Opens the confirmation for the selected scenario. It sits under the
          list for now; it belongs at the bottom of the scenario preview, so
          the operator sees what a scenario requires before activating it. The
          active scenario is stood down instead (MET-A-009). */}
      {selectedIsActive ? (
        <button
          className="scenario-action scenario-action--stop"
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          Stop scenarie
        </button>
      ) : (
        <button
          className="scenario-action scenario-action--start"
          type="button"
          onClick={() => setConfirming(true)}
          disabled={
            !previewReady ||
            !canActivate(selected?.scenarioId ?? null, busy, activeIds)
          }
        >
          Aktivér valgt scenarie
        </button>
      )}

      {confirming &&
        selected &&
        (selectedIsActive ? (
          <ConfirmStandDown
            scenario={selected}
            onConfirm={() => standDown(selected)}
            onCancel={() => setConfirming(false)}
          />
        ) : (
          <ConfirmActivation
            scenario={selected}
            outgoing={activations
              .filter((a) => a.scenarioId !== selected.scenarioId)
              .slice(0, 1)
              .map((a) => names.get(a.scenarioId) ?? a.scenarioId)}
            onConfirm={() => activate(selected)}
            onCancel={() => setConfirming(false)}
          />
        ))}

      <ActivationStatus activation={displayActivation} />
    </section>
  );
}

function ActivationStatus({ activation }: { activation: ActivationState }) {
  switch (activation.status) {
    case "idle":
      return null;
    case "activating":
      return <p role="status">Aktiverer scenarie…</p>;
    case "standing-down":
      return <p role="status">Deaktiverer scenarie…</p>;
    case "error":
      return <p role="alert">{activation.message}</p>;
    case "done":
      return (
        <p role="status">
          Scenarie {activation.state.scenarioId} er {activation.state.status},
          startet {activation.state.startedAt} af {activation.state.actor}.
        </p>
      );
    case "stood-down":
      return (
        <p role="status">
          Scenarie {activation.state.scenarioId} er deaktiveret.
        </p>
      );
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
  onSelect: (scenarioId: string | null) => void;
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
        // The selected scenario is inverted, the shared "selected" style in
        // Theme, and bold, so it is marked by more than colour. aria-pressed
        // tells screen readers which one is selected.
        return (
          <li
            key={scenario.scenarioId}
            className={live ? "scenario-list-item--live" : undefined}
          >
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                onSelect(isSelected && !live ? null : scenario.scenarioId)
              }
              disabled={disabled}
            >
              {scenario.name}
            </button>
            {/* A filled green dot when the scenario is live and an empty ring
                when it is not, so it is marked by shape as well as colour. */}
            <span
              className={
                live ? "scenario-badge scenario-badge--live" : "scenario-badge"
              }
              role="img"
              aria-label={live ? "Aktiv" : "Ikke aktiv"}
              title={live ? "Aktiv" : "Ikke aktiv"}
            >
              {live ? "Aktiv" : "Ikke aktiv"}
            </span>
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
      className="scenario-dialog"
      ref={dialogRef}
      onClose={onCancel}
      aria-labelledby="confirm-activation-heading"
      aria-describedby="confirm-activation-description"
    >
      <h3 id="confirm-activation-heading">
        {outgoing.length > 0
          ? "Skift til dette scenarie?"
          : "Start dette scenarie?"}
      </h3>
      <div className="scenario-dialog-scenario">
        <span>Scenarie</span>
        <strong>
          {scenario.scenarioId} · {scenario.name}
        </strong>
      </div>
      <p
        id="confirm-activation-description"
        className={
          outgoing.length > 0
            ? "scenario-dialog-note scenario-dialog-note--warning"
            : "scenario-dialog-note"
        }
      >
        {outgoing.length > 0 && (
          <>
            Det aktive scenarie <strong>{outgoing[0]}</strong> stoppes, når
            dette scenarie startes.
          </>
        )}
        {outgoing.length === 0 &&
          "Scenariet bliver aktivt for kontrolrummet og stewards."}
      </p>
      <div className="scenario-dialog-actions">
        <button
          type="button"
          className="scenario-dialog-cancel"
          onClick={() => dialogRef.current?.close()}
        >
          Annullér
        </button>
        <button
          type="button"
          className="scenario-dialog-primary"
          onClick={onConfirm}
        >
          {outgoing.length > 0 ? "Skift scenarie" : "Start scenarie"}
        </button>
      </div>
    </dialog>
  );
}

// Confirm Standing down the active scenario.
export function ConfirmStandDown({
  scenario,
  onConfirm,
  onCancel,
}: {
  scenario: Pick<ScenarioSummary, "name"> &
    Partial<Pick<ScenarioSummary, "scenarioId">>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      className="scenario-dialog"
      ref={dialogRef}
      onClose={onCancel}
      aria-labelledby="confirm-stand-down-heading"
      aria-describedby="confirm-stand-down-description"
    >
      <h3 id="confirm-stand-down-heading">Stop dette scenarie?</h3>
      <div className="scenario-dialog-scenario">
        <span>Aktivt scenarie</span>
        <strong>
          {scenario.scenarioId ? `${scenario.scenarioId} · ` : ""}
          {scenario.name}
        </strong>
      </div>
      <p id="confirm-stand-down-description" className="scenario-dialog-note">
        Scenariet afsluttes for alle brugere.
      </p>
      <div className="scenario-dialog-actions">
        <button
          type="button"
          className="scenario-dialog-cancel"
          onClick={() => dialogRef.current?.close()}
        >
          Annullér
        </button>
        <button
          type="button"
          className="scenario-dialog-primary confirm-danger"
          onClick={onConfirm}
        >
          Stop scenarie
        </button>
      </div>
    </dialog>
  );
}
