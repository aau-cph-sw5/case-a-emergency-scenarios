import type { ReactNode } from "react";
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
  lineGroup,
  onSelect,
  statusBar,
  statusPopup,
}: {
  token: string;
  selectedId: string | null;
  lineGroup: "M1/M2" | "M3/M4";
  onSelect: (id: string | null) => void;
  statusBar?: ReactNode;
  statusPopup?: ReactNode;
}) {
  const { activations } = useLiveData();
  const isActive =
    selectedId !== null && activations.some((a) => a.scenarioId === selectedId);
  const previewId = isActive ? null : selectedId;
  const preview = useScenario(previewId);
  const { scenario } = preview;
  const hasActiveScenario = activations.length > 0;
  const mapScenarioId = selectedId ?? activations.at(-1)?.scenarioId ?? null;

  return (
    <OperatorSections
      statusPopup={statusPopup}
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
          lineGroup={lineGroup}
          scenarioId={mapScenarioId}
          scenario={selectedId === null || isActive ? undefined : scenario}
          deployments={
            activations.filter((a) => a.scenarioId === mapScenarioId).at(-1) ??
            null
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
