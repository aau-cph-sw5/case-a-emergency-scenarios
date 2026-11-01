import { useState } from "react";
import { ScenarioList } from "../ScenarioList";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";
import { OperatorSections } from "./OperatorSections";
import { ScenarioPreview } from "./ScenarioPreview";
import { LiveCoverage } from "./LiveCoverage";

export function ScenarioWorkspace({
  token,
  selectedId,
  onSelect,
}: {
  token: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { activations } = useLiveData();
  // The same immediate active marking as #182, until the shared reload arrives.
  const [activatedId, setActivatedId] = useState<string | null>(null);
  const isActive =
    selectedId !== null &&
    (selectedId === activatedId ||
      activations.some((a) => a.scenarioId === selectedId));
  const previewId = isActive ? null : selectedId;
  const preview = useScenario(previewId);
  const { scenario } = preview;
  const showRequirements =
    previewId !== null || (activations.length === 0 && activatedId === null);

  return (
    <OperatorSections
      scenarioSelection={
        <ScenarioList
          token={token}
          selectedId={selectedId}
          onSelect={onSelect}
          onActivated={setActivatedId}
          previewReady={scenario !== null}
        />
      }
      map={<p>Kortvisning er endnu ikke tilgængelig.</p>}
      coverage={
        showRequirements ? (
          <ScenarioPreview scenarioId={previewId} preview={preview} />
        ) : (
          <LiveCoverage />
        )
      }
    />
  );
}
