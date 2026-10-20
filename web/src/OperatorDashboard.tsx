import { useSocketState } from "../../shared/socket/useSocketState";
import ScenarioStationList from "../../shared/components/stationView";
import scenarioFixture from "../../fixtures/v1/scenarios/DEMO-001.json";
import scenarioStateFixture from "../../fixtures/v1/scenario-state.json";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { socket } from "./socket";

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
  const { isConnected, messages, positions } = useSocketState(socket);
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
      <section aria-labelledby="positions-heading">
        <h2 id="positions-heading">Stewardpositioner</h2>
        {reports.length === 0 ? (
          <p>Ingen positioner endnu.</p>
        ) : (
          <ul>
            {reports.map((report) => (
              <li key={report.staff}>
                {report.staff} er ved {report.station}, rapporteret{" "}
                {new Date(report.reportedAt).toLocaleTimeString("da-DK")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScenarioList token={token} />
      <ScenarioStationList
        scenario={selectedScenario}
        activeDeployments={scenarioState}
      />
    </main>
  );
}
