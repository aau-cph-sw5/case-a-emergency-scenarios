import { socket } from "./socket";
import { useSocketState } from "../../shared/socket/useSocketState";
import { usePositionReports } from "../../shared/socket/usePositionReports";
/*import ScenarioStationList from "../../shared/components/stationView";
import scenarioFixture from "../../fixtures/v1/scenarios/DEMO-001.json";
import scenarioStateFixture from "../../fixtures/v1/scenario-state.json";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions"; */
import { OperatorSections } from "./components/OperatorSections";

// const selectedScenario = scenarioFixture as Scenario;
// const scenarioState = scenarioStateFixture as ScenarioState;

// The control-room dashboard. App opens the socket.
export function OperatorDashboard({
  //token,
  onLogout,
}: {
  //token: string;
  onLogout: () => void;
}) {
  useSocketState(socket);
  // Every position report pushed by the server over the socket, newest first.
  usePositionReports(socket);

  return (
    <main>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <OperatorSections />
    </main>
  );
}
