import { useState } from "react";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";
import { OperatorSections } from "./components/OperatorSections";
import { LiveCoverage } from "./components/LiveCoverage";
import { LiveStatusBar } from "./components/LiveStatusBar";

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // The scenario the operator has selected in the list. It is held here, in
  // the dashboard, rather than inside the list, so that other parts of the
  // dashboard can use the same selection. The scenario preview, which shows
  // what the selected scenario requires before it is activated, reads it from
  // here.
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  return (
    <main>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <OperatorSections
        scenarioSelection={
          <>
            <LiveStatusBar />
            {/* The server sends "activations-changed" after an activation, and
                the data layer loads again, so the dashboard has nothing to do. */}
            <ScenarioList
              token={token}
              selectedId={selectedScenarioId}
              onSelect={setSelectedScenarioId}
              onActivated={() => {}}
            />
          </>
        }
        map={<p>Insert map here...</p>}
        coverage={<LiveCoverage />}
      />
      {/* Fixed in the bottom right corner, so it follows the wireframe whatever
          the section layout does. */}
      <div className="status-popup">
        {/* TEMPORARY: mock shows hardcoded rows. Remove the prop for live data. */}
        <StewardPositions mock={import.meta.env.DEV} />
      </div>
    </main>
  );
}
