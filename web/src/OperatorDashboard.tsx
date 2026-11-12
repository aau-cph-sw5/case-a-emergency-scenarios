import { useState } from "react";
import { StewardPositions } from "./components/StewardPositions";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";
import { LiveStatusBar } from "./components/LiveStatusBar";
import { mockStewardPositions } from "./local-settings";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import type { LineGroup } from "../../shared/auth/line-groups";
import { lineGroupFromToken } from "../../shared/auth/login";

// The line group as operators know it, e.g. "M1/M2".
const LINE_GROUP_LABELS: Record<LineGroup, "M1/M2" | "M3/M4"> = {
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
  const ownLineGroup = lineGroupFromToken(token);
  // The map starts on the operator's own line group.
  const [lineGroup, setLineGroup] = useState<"M1/M2" | "M3/M4">(
    ownLineGroup ? LINE_GROUP_LABELS[ownLineGroup] : "M1/M2",
  );
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
          <div
            className="operator-line-switcher"
            role="group"
            aria-label="Vælg metrolinjer"
          >
            <button
              type="button"
              aria-pressed={lineGroup === "M1/M2"}
              onClick={() => setLineGroup("M1/M2")}
            >
              M1 / M2
            </button>
            <button
              type="button"
              aria-pressed={lineGroup === "M3/M4"}
              onClick={() => setLineGroup("M3/M4")}
            >
              M3 / M4
            </button>
          </div>
          <span className="operator-avatar" aria-hidden="true">
            OP
          </span>
          <strong>
            {ownLineGroup
              ? `Operator (${LINE_GROUP_LABELS[ownLineGroup]})`
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
        lineGroup={lineGroup}
        onSelect={setSelectedId}
        statusBar={<LiveStatusBar />}
        statusPopup={<StewardPositions mock={mockStewardPositions} />}
      />
    </main>
  );
}
