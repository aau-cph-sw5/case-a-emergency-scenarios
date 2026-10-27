import { useState } from "react";
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

// The control-room dashboard. App opens the socket.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const { messages } = useSocketState(socket);
  // Every position report pushed by the server over the socket, newest first.
  const reports = usePositionReports(socket);
  // The scenario the operator has selected in the list. It is held here, in
  // the dashboard, rather than inside the list, so that other parts of the
  // dashboard can use the same selection. The scenario preview, which shows
  // what the selected scenario requires before it is activated, reads it from
  // here.
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  );

  return (
    <main>
      <h1>Nødscenarier</h1>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      {messages.length > 0 && (
        <ul>
          {messages.map((message) => (
            <li key={message.id}>{message.text}</li>
          ))}
        </ul>
      )}

      <StewardPositions reports={reports} />

      <ScenarioList
        token={token}
        selectedId={selectedScenarioId}
        onSelect={setSelectedScenarioId}
      />
      <ScenarioStationList
        scenario={selectedScenario}
        activeDeployments={scenarioState}
      />
    </main>
  );
}
