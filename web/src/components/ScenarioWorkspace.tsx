import { useState, type ReactNode } from "react";
import { ScenarioList } from "../ScenarioList";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";
import { OperatorSections } from "./OperatorSections";
import { ScenarioPreview } from "./ScenarioPreview";
import { LiveCoverage } from "./LiveCoverage";
import { MetroMap } from "./MetroMap";

export function ScenarioWorkspace({
  token,
  selectedId,
  onSelect,
  statusBar,
  statusPopup,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  statusBar?: ReactNode;
  statusPopup?: ReactNode;
}) {
  const { activations } = useLiveData();
  const [lineControlsTarget, setLineControlsTarget] =
    useState<HTMLDivElement | null>(null);
  const isActive =
    selectedId !== null && activations.some((a) => a.scenarioId === selectedId);
  const previewId = isActive ? null : selectedId;
  const preview = useScenario(previewId);
  const { scenario } = preview;
  const hasActiveScenario = activations.length > 0;

  return (
    <OperatorSections
      statusPopup={statusPopup}
      mapControls={
        <div className="operator-map-controls" ref={setLineControlsTarget} />
      }
      scenarioSelection={
        <>
          <ScenarioList
            token={token}
            selectedId={selectedId}
            onSelect={onSelect}
            onActivated={() => {}}
            previewReady={scenario !== null}
            summary={statusBar}
          />
        </>
      }
      map={
        <MetroMap
          lineControlsTarget={lineControlsTarget}
          scenarioId={selectedId}
          scenario={isActive ? undefined : scenario}
          // The live coverage colours the map only for the active scenario;
          // a preview shows its requirements as before (#310).
          deployments={
            isActive
              ? (activations
                  .filter((a) => a.scenarioId === selectedId)
                  .at(-1) ?? null)
              : null
          }
        />
      }
      coverage={
        <>
          {hasActiveScenario && <LiveCoverage />}
          {(!hasActiveScenario || previewId !== null) && (
            <ScenarioPreview scenarioId={previewId} preview={preview} />
          )}
        </>
      }
    />
  );
}
