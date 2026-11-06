import { useEffect, useRef, type ReactNode } from "react";
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
  lineGroup,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  statusBar?: ReactNode;
  lineGroup?: "M1/M2" | "M3/M4";
}) {
  const { activations, scenarios } = useLiveData();
  const previousActivationsRef = useRef(activations);
  useEffect(() => {
    const wasActive = previousActivationsRef.current.some(
      (activation) => activation.scenarioId === selectedId,
    );
    const remainsActive = activations.some(
      (activation) => activation.scenarioId === selectedId,
    );
    previousActivationsRef.current = activations;
    if (selectedId !== null && wasActive && !remainsActive) onSelect(null);
  }, [activations, onSelect, selectedId]);
  useEffect(() => {
    if (selectedId === null && activations.length > 0) {
      onSelect(activations[activations.length - 1].scenarioId);
    }
  }, [activations, onSelect, selectedId]);
  const isActive =
    selectedId !== null && activations.some((a) => a.scenarioId === selectedId);
  const previewId = isActive ? null : selectedId;
  const preview = useScenario(previewId);
  const { scenario } = preview;
  const hasActiveScenario = activations.length > 0;
  const selectedName =
    scenario?.name ??
    scenarios?.find((item) => item.scenarioId === selectedId)?.name;

  return (
    <OperatorSections
      scenarioSelection={
        <>
          {statusBar}
          <ScenarioList
            token={token}
            selectedId={selectedId}
            onSelect={onSelect}
            onActivated={() => {}}
            previewReady={scenario !== null}
          />
        </>
      }
      map={
        <>
          <div className="map-heading">
            <div>
              <h1>
                {selectedId === null
                  ? "Metronettet"
                  : `${selectedId}${selectedName ? ` ${selectedName}` : ""}`}
              </h1>
              <p>Oversigt over linjer og berørte stationer</p>
            </div>
          </div>
          <div className="map-canvas">
            <MetroMap
              scenarioId={selectedId}
              lineGroup={lineGroup}
              scenario={isActive ? undefined : scenario}
            />
          </div>
        </>
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
