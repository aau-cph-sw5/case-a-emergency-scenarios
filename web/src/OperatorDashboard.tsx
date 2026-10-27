import { socket } from "./socket";
import { usePositionReports } from "../../shared/socket/usePositionReports";
import ScenarioStationList from "../../shared/components/stationView";
import scenarioFixture from "../../fixtures/v1/scenarios/DEMO-001.json";
import scenarioStateFixture from "../../fixtures/v1/scenario-state.json";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";
import { OperatorSections } from "./components/OperatorSections";
const selectedScenario = scenarioFixture as Scenario;
const scenarioState = scenarioStateFixture as ScenarioState;
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
        scenarioSelection={<ScenarioList token={token} />}
        map={<p>Insert map here...</p>}
        coverage={
          <>
            <ScenarioStationList
              scenario={selectedScenario}
              activeDeployments={scenarioState}
            />
            <StewardPositions reports={reports} />
          </>
        }
      />
    </main>
  );
}
