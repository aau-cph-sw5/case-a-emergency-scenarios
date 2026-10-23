import { useCallback, useEffect, useState } from "react";
import { getJson } from "./get-json";
import { socket } from "./socket";
import { useSocketState } from "../../shared/socket/useSocketState";
import { usePositionReports } from "../../shared/socket/usePositionReports";
import ScenarioStationList from "../../shared/components/stationView";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";

type Active = { scenario: Scenario; state: ScenarioState };

function isScenario(data: unknown): data is Scenario {
  const s = data as Partial<Scenario> | null;
  return typeof s?.scenarioId === "string" && Array.isArray(s.versions);
}

function isActivationList(data: unknown): data is ScenarioState[] {
  return Array.isArray(data);
}

// The control-room dashboard. The socket demo is from MET-A-004.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const { isConnected, messages } = useSocketState(socket);
  // Every position report pushed by the server over the socket, newest first.
  const reports = usePositionReports(socket);

  // The latest activated scenario; null until one is active.
  const [active, setActive] = useState<Active | null>(null);

  // The scenario holds the stations; its activation holds the deployments.
  const showActivated = useCallback(
    async (scenarioId: string) => {
      const [scenario, activations] = await Promise.all([
        getJson(
          `/api/v1/scenarios/${encodeURIComponent(scenarioId)}`,
          token,
          isScenario,
        ),
        getJson("/api/v1/activations?status=ACTIVE", token, isActivationList),
      ]);
      const state = activations
        .filter((a) => a.scenarioId === scenarioId)
        .at(-1);
      if (state) setActive({ scenario, state });
    },
    [token],
  );

  // Shows what scenario is already active.
  useEffect(() => {
    getJson("/api/v1/activations?status=ACTIVE", token, isActivationList)
      .then((list) => {
        const latest = list.at(-1);
        if (latest) return showActivated(latest.scenarioId);
      })
      .catch(console.error);
  }, [token, showActivated]);

  // The server refuses a socket without a valid token and uses its role to
  // decide which events this socket gets.
  function toggleSocket() {
    if (isConnected) {
      socket.disconnect();
      return;
    }
    socket.auth = { token };
    socket.connect();
  }

  return (
    <main>
      <h1>Nødscenarier</h1>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <p>Socket: {isConnected ? "connected" : "disconnected"}</p>
      <button onClick={toggleSocket} type="button">
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

      <ScenarioList
        token={token}
        onActivated={(id) => showActivated(id).catch(console.error)}
      />
      {active ? (
        <ScenarioStationList
          scenario={active.scenario}
          activeDeployments={active.state}
        />
      ) : (
        <p>Intet aktivt scenarie.</p>
      )}
    </main>
  );
}
