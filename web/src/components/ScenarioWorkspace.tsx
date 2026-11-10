import { useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ScenarioList } from "../ScenarioList";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";
import { OperatorSections } from "./OperatorSections";
import { ScenarioPreview } from "./ScenarioPreview";
import { LiveCoverage } from "./LiveCoverage";
import { MetroMap } from "./MetroMap";
import { StewardPositions } from "./StewardPositions";
import { mockStewardPositions } from "../local-settings";

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
  const [lineControlsTarget, setLineControlsTarget] =
    useState<HTMLDivElement | null>(null);
  const [coverageSummaryTarget, setCoverageSummaryTarget] =
    useState<HTMLDivElement | null>(null);
  const inCoverageHeader = (summary: ReactElement) =>
    coverageSummaryTarget && createPortal(summary, coverageSummaryTarget);
  const isActive =
    selectedId !== null && activations.some((a) => a.scenarioId === selectedId);
  const previewId = isActive ? null : selectedId;
  const preview = useScenario(previewId);
  const { scenario } = preview;
  const hasActiveScenario = activations.length > 0;
  // The mock plays a shift without a live scenario, so it shows the log too.
  const showStatusLog = hasActiveScenario || mockStewardPositions;

  return (
    <OperatorSections
      statusLog={
        showStatusLog && <StewardPositions mock={mockStewardPositions} />
      }
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
          // With nothing chosen, the map shows the live scenario.
          scenarioId={selectedId ?? activations.at(-1)?.scenarioId ?? null}
          // Undefined lets the map load the live scenario itself.
          scenario={previewId === null ? undefined : scenario}
          muted={hasActiveScenario}
        />
      }
      coverageSummary={<div ref={setCoverageSummaryTarget} />}
      coverage={
        <>
          {hasActiveScenario && (
            <LiveCoverage renderSummary={inCoverageHeader} />
          )}
          {/* While switching, the live scenario keeps the header. */}
          {(!hasActiveScenario || previewId !== null) && (
            <ScenarioPreview
              scenarioId={previewId}
              preview={preview}
              renderSummary={hasActiveScenario ? undefined : inCoverageHeader}
            />
          )}
        </>
      }
    />
  );
}
