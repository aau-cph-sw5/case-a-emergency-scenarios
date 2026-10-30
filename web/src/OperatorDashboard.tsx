import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";
import { OperatorSections } from "./components/OperatorSections";
import { LiveCoverage } from "./components/LiveCoverage";

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  return (
    <main>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <OperatorSections
        scenarioSelection={
          // The server sends "activations-changed" after an activation, and
          // the data layer loads again, so the dashboard has nothing to do.
          <ScenarioList token={token} onActivated={() => {}} />
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
