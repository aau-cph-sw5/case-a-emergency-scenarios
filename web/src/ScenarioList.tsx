import { useEffect, useState, type ReactNode } from "react";
import { useLiveData } from "./data/liveData";
import { canActivate, keepSelection } from "./selection";
import { ScenarioActions } from "./ScenarioActions";
import { ScenarioConfirm } from "./ScenarioConfirm";
import { ScenarioPicker } from "./ScenarioPicker";
import { useActivation, type ActivationState } from "./useActivation";
import { useSwitchPhase } from "./useSwitchPhase";

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
  // True while the confirmation dialog is open for the selected scenario.
  const [confirming, setConfirming] = useState(false);
  // Names for the scenarios being deactivated, shown in the confirmation.
  const names = new Map((scenarios ?? []).map((s) => [s.scenarioId, s.name]));
  const activeScenario = activations.at(-1);
  const activeScenarioId = activeScenario?.scenarioId ?? null;
  const switcher = useSwitchPhase(activeScenarioId, onSelect);
  const { activation, activate, standDown } = useActivation({
    token,
    activations,
    previewReady,
    onActivated: (scenarioId) => {
      switcher.reset();
      onSelect(scenarioId);
      onActivated(scenarioId);
    },
    // The map returns to the default map that it shows at the start.
    onStoodDown: () => onSelect(null),
  });
  // The scenarios that are already active. A scenario activated here counts
  // as active straight away, so the operator cannot try to activate it again
  // before the reloaded activations arrive.
  const activeIds = new Set(activations.map((a) => a.scenarioId));
  if (activation.status === "done") activeIds.add(activation.scenarioId);

  // Clear the selection if the selected scenario is no longer in the list.
  useEffect(() => {
    if (scenarios === null) return;
    const kept = keepSelection(selectedId, scenarios);
    if (kept !== selectedId) onSelect(kept);
  }, [scenarios, selectedId, onSelect]);

  const selected =
    scenarios?.find((scenario) => scenario.scenarioId === selectedId) ?? null;
  // Keep STOP available after a reload, even when no list item is selected.
  const showingActive = activeScenario !== undefined && !switcher.switching;
  const actionScenario = showingActive
    ? {
        scenarioId: activeScenario.scenarioId,
        name: names.get(activeScenario.scenarioId) ?? activeScenario.scenarioId,
      }
    : selected;
  // Selecting the active scenario offers to stand it down instead.
  const actionIsActive =
    !switcher.switching && (showingActive || activeIds.has(selectedId ?? ""));
  // No new action is started while one is on its way to the server.
  const busy =
    activation.status === "activating" ||
    activation.status === "standing-down" ||
    switcher.closing;
  const choosingScenario = activeScenario === undefined || switcher.switching;
  const classes = [
    "scenario-selection",
    !choosingScenario && "scenario-selection--active",
    switcher.switching && "scenario-selection--switching",
    switcher.closing && "is-closing",
  ];

  // An active scenario uses this space for its live metrics instead of search.
  return (
    <section
      className={classes.filter(Boolean).join(" ")}
      aria-label="Scenarier og handlinger"
    >
      <ScenarioPicker
        token={token}
        scenarios={scenarios}
        scenariosError={scenariosError}
        reloadScenarios={reloadScenarios}
        selectedId={selectedId}
        activeIds={activeIds}
        activeFailed={error !== null}
        busy={busy}
        hidden={!choosingScenario}
        closing={switcher.closing}
        onSelect={onSelect}
        onExitEnd={switcher.finish}
      />
      {summary && !switcher.switching && (
        <div className="operator-summaries">{summary}</div>
      )}

      <ScenarioActions
        isActive={actionIsActive}
        hasActive={activeScenario !== undefined}
        busy={busy}
        switching={switcher.switching}
        canCancel={selectedId !== null}
        canStart={
          previewReady &&
          canActivate(selected?.scenarioId ?? null, busy, activeIds)
        }
        targetName={actionScenario?.name ?? ""}
        onSwitch={() => {
          switcher.open();
          onSelect(null);
        }}
        onCancel={switcher.cancel}
        onRequestConfirm={() => setConfirming(true)}
      />

      {confirming && actionScenario && (
        <ScenarioConfirm
          name={actionScenario.name}
          isActive={actionIsActive}
          outgoingNames={activations
            .filter((a) => a.scenarioId !== actionScenario.scenarioId)
            .map((a) => names.get(a.scenarioId) ?? a.scenarioId)}
          onStandDown={() => {
            setConfirming(false);
            void standDown(actionScenario);
          }}
          onActivate={() => {
            setConfirming(false);
            void activate(actionScenario, busy, activeIds);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}

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
