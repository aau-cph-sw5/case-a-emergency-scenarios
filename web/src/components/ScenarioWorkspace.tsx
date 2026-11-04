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
  onSelect,
  statusBar,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  statusBar?: ReactNode;
}) {
  const { activations } = useLiveData();
  const isActive =
    selectedId !== null && activations.some((a) => a.scenarioId === selectedId);
  const previewId = isActive ? null : selectedId;
  const preview = useScenario(previewId);
  const { scenario } = preview;
  const hasActiveScenario = activations.length > 0;

  return (
    <OperatorSections
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
          scenarioId={selectedId}
          scenario={isActive ? undefined : scenario}
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
