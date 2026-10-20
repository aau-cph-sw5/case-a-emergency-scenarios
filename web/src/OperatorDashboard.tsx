import { socket } from "./socket";
import { useSocketState } from "../../shared/socket/useSocketState";
import { usePositionReports } from "../../shared/socket/usePositionReports";
import ScenarioStationList from "../../shared/components/stationView";
import scenarioFixture from "../../fixtures/v1/scenarios/DEMO-001.json";
import scenarioStateFixture from "../../fixtures/v1/scenario-state.json";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";

const selectedScenario = scenarioFixture as Scenario;
const scenarioState = scenarioStateFixture as ScenarioState;

// The control-room dashboard. The socket demo is from MET-A-004.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const { isConnected, messages } = useSocketState(socket);
  const positions = usePositionReports(socket);
  // The latest position per steward, pushed by the server over the socket.
  const reports = Object.values(positions);

  return (
    <main>
      <h1>Nødscenarier</h1>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <p>Socket: {isConnected ? "connected" : "disconnected"}</p>
      <button
        onClick={() => (isConnected ? socket.disconnect() : socket.connect())}
        type="button"
      >
        {isConnected ? "Disconnect socket" : "Connect socket"}
      </button>
      {messages.length > 0 && (
        <ul>
          {messages.map((message) => (
            <li key={message.id}>{message.text}</li>
          ))}
        </ul>
      )}

      <StewardPositions reports={reports} />

      <ScenarioList token={token} />
      <ScenarioStationList
        scenario={selectedScenario}
        activeDeployments={scenarioState}
      />
    </main>
  );
}
