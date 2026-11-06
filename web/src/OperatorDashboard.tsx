import { useState } from "react";
import { StewardPositions } from "./components/StewardPositions";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";
import { LiveStatusBar } from "./components/LiveStatusBar";
import { mockStewardPositions } from "./local-settings";

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  lineGroup,
}: {
  token: string;
  onLogout: () => void;
  lineGroup?: "M1/M2" | "M3/M4";
}) {
  // The map and requirements preview share the selected scenario.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <main className="operator-dashboard">
      <ScenarioWorkspace
        token={token}
        lineGroup={lineGroup}
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusBar={<LiveStatusBar />}
      />
      {/* Fixed in the bottom right corner, so it follows the wireframe whatever
          the section layout does. */}
      <div className="status-popup">
        <StewardPositions mock={mockStewardPositions} />
      </div>
    </main>
  );
}
