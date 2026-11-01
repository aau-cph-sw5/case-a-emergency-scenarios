import { useState } from "react";
import { StewardPositions } from "./components/StewardPositions";
import { ScenarioWorkspace } from "./components/ScenarioWorkspace";

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // Shared with the map preview in #183 when it is added.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <main>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <ScenarioWorkspace
        token={token}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      {/* Fixed in the bottom right corner, so it follows the wireframe whatever
          the section layout does. */}
      <div className="status-popup">
        <StewardPositions />
      </div>
    </main>
  );
}
