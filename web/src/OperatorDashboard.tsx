import { useState } from "react";
import { StewardPositions } from "./components/StewardPositions";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";
import { LiveStatusBar } from "./components/LiveStatusBar";
import { mockStewardPositions } from "./local-settings";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import type { LineGroup } from "../../shared/auth/line-groups";
import { lineGroupFromToken } from "../../shared/auth/login";

// The line group as operators know it, e.g. "M1/M2".
const LINE_GROUP_LABELS: Record<LineGroup, string> = {
  M1_M2: "M1/M2",
  M3_M4: "M3/M4",
};

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
  const lineGroup = lineGroupFromToken(token);
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
          <strong>
            {lineGroup
              ? `Operator (${LINE_GROUP_LABELS[lineGroup]})`
              : "Operator"}
          </strong>
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
