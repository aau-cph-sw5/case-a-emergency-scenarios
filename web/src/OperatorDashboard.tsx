import { useState } from "react";
import { StewardPositions } from "./components/StewardPositions";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";
import { LiveStatusBar } from "./components/LiveStatusBar";
import { mockStewardPositions } from "./local-settings";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // The map and requirements preview share the selected scenario.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <main className="operator-dashboard">
      <header className="operator-topbar">
        <div className="operator-brand">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <strong>Metro Service</strong>
        </div>
        <ActiveScenarioBanner />
        <div className="operator-profile">
          <span className="operator-avatar" aria-hidden="true">
            OP
          </span>
          <strong>Operator</strong>
          <button className="logout-button" onClick={onLogout} type="button">
            Log ud
          </button>
        </div>
      </header>
      <ScenarioWorkspace
        token={token}
        selectedId={selectedId}
        onSelect={setSelectedId}
        statusBar={<LiveStatusBar />}
        statusPopup={<StewardPositions mock={mockStewardPositions} />}
      />
    </main>
  );
}
