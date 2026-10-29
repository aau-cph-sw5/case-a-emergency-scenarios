import { socket } from "./socket";
import { usePositionReports } from "../../shared/socket/usePositionReports";
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
  // Every position report pushed by the server over the socket, newest first.
  const reports = usePositionReports(socket);

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
        coverage={
          <>
            <LiveCoverage />
            <StewardPositions reports={reports} />
          </>
        }
      />
    </main>
  );
}
