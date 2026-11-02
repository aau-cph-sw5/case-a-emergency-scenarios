import { useEffect, useRef, useState } from "react";
import { useLiveData } from "./data/liveData";
import { filterScenarios } from "./filter-scenarios";
import { postJson, userMessage } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";
import type { ScenarioSummary } from "./scenarios";

type ActivationState =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "standing-down" }
  | { status: "error"; message: string }
  | { status: "done"; state: ScenarioState }
  | { status: "stood-down"; state: ScenarioState };

export function ScenarioList({
  token,
  onActivated,
}: {
  token: string;
  onActivated: (scenarioId: string) => void;
}) {
  // The scenario list comes from LiveDataProvider, which loads it once.
  const { scenarios, scenariosError, reloadScenarios, activations } =
    useLiveData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ScenarioSummary | null>(null);
  // The scenarios that are live now, for the dot next to each one.
  const activeIds = new Set(activations.map((a) => a.scenarioId));
  const names = new Map((scenarios ?? []).map((s) => [s.scenarioId, s.name]));
  const [activation, setActivation] = useState<ActivationState>({
    status: "idle",
  });

  async function activate(scenario: ScenarioSummary) {
    setSelected(null);
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
    setSelected(null);
    const active = activations.find(
      (a) => a.scenarioId === scenario.scenarioId,
    );
    if (active === undefined) return;
    setActivation({ status: "standing-down" });
    try {
      const state = await postJson(
        `/api/v1/activations/${encodeURIComponent(active.activationId)}/stand-down`,
        token,
        isScenarioState,
      );
      setActivation({ status: "stood-down", state });
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
            activeIds={activeIds}
            onSelect={setSelected}
            disabled={
              activation.status === "activating" ||
              activation.status === "standing-down"
            }
          />
        ))}

      {selected &&
        (activeIds.has(selected.scenarioId) ? (
          <ConfirmStandDown
            scenario={selected}
            onConfirm={() => standDown(selected)}
            onCancel={() => setSelected(null)}
          />
        ) : (
          <ConfirmActivation
            scenario={selected}
            outgoing={activations
              .filter((a) => a.scenarioId !== selected.scenarioId)
              .map((a) => names.get(a.scenarioId) ?? a.scenarioId)}
            onConfirm={() => activate(selected)}
            onCancel={() => setSelected(null)}
          />
        ))}

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
  activeIds,
  onSelect,
  disabled,
}: {
  scenarios: ScenarioSummary[];
  query: string;
  activeIds: Set<string>;
  onSelect: (scenario: ScenarioSummary) => void;
  disabled: boolean;
}) {
  // No match is an empty list, not an error.
  if (scenarios.length === 0) {
    return <p role="status">Ingen scenarier matcher “{query.trim()}”.</p>;
  }
  return (
    <ul className="scenario-list">
      {scenarios.map((scenario) => {
        const live = activeIds.has(scenario.scenarioId);
        return (
          <li key={scenario.scenarioId}>
            <button
              type="button"
              onClick={() => onSelect(scenario)}
              disabled={disabled}
            >
              {scenario.name}
            </button>
            {/* Green when the scenario is live, empty when it is not. */}
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
      onClose={onCancel}
      aria-labelledby="confirm-activation-heading"
    >
      <h3 id="confirm-activation-heading">Aktivér “{scenario.name}”?</h3>
      {outgoing.length > 0 && (
        <p className="confirm-warning">
          Dette vil deaktivere scenarie{" "}
          {outgoing.map((name) => `“${name}”`).join(", ")}
        </p>
      )}
      <button type="button" onClick={onConfirm}>
        Bekræft
      </button>{" "}
      <button type="button" onClick={() => dialogRef.current?.close()}>
        Annullér
      </button>
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
      onClose={onCancel}
      aria-labelledby="confirm-stand-down-heading"
    >
      <h3 id="confirm-stand-down-heading" className="confirm-warning">
        Vil du deaktivere “{scenario.name}”?
      </h3>
      <button type="button" className="confirm-danger" onClick={onConfirm}>
        Deaktivér
      </button>{" "}
      <button type="button" onClick={() => dialogRef.current?.close()}>
        Annullér
      </button>
    </dialog>
  );
}
