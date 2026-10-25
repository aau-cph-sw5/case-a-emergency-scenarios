import { useCallback, useEffect, useState } from "react";
import { getJson } from "./get-json";
import { socket } from "./socket";
import { useSocketState } from "../../shared/socket/useSocketState";
import { usePositionReports } from "../../shared/socket/usePositionReports";
import ScenarioStationList from "../../shared/components/stationView";
import ScenarioMapInitializer from "../../shared/components/scenarioMapInitializer";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";
import {
  colors,
  palette,
  text,
  webBox,
  webButton,
  webPage,
} from "../../shared/Theme";

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
    <div style={webPage}>
      <header
        style={{...webBox, display: "grid", gridTemplateColumns: "1fr auto 1fr",}}>
        <h1 style={{ ...text.title, justifySelf: "start" }}>Emergency Scenario Dashboard</h1>
        <div style={{ textAlign: "center", ...text.header }}>
          <button
            onClick={toggleSocket}
            type="button"
            style={{
              ...webButton,
              width: "100%",
              backgroundColor: isConnected
                ? webButton.backgroundColor
                : palette.metroLineThree,
            }}
          >
            {isConnected ? "Connected" : "Not Connected"}
          </button>
        </div>
        <button
          onClick={onLogout}
          type="button"
          style={{ ...webButton, justifySelf: "end" }}>
          Log ud
        </button>
      </header>

      <main style={{ display: "flex", flex: 1}}>
        <aside
          style={{...webBox, width: "25%"}}>
          <ScenarioList
            token={token}
            onActivated={(id) => showActivated(id).catch(console.error)}
          />
        </aside>

        <section style={{ ...webBox, width: "50%", textAlign: "center",}}>
          <h2 style={{ ...text.title, marginTop: 0 }}>
            {active?.scenario.name ?? "Intet aktivt scenarie."}
          </h2>
          {active && (
            <div style={{ width: "100%", height: 320 }}>
              <ScenarioMapInitializer scenario={active.scenario} />
            </div>
          )}
        </section>

        <aside style={{...webBox, width: "25%"}}>
          {active ? (
            <ScenarioStationList
              scenario={active.scenario}
              activeDeployments={active.state}
            />
          ) : (<p>Intet aktivt scenarie.</p>)}
        </aside>
      </main>

      <footer style={{ ...webBox }}>
        <StewardPositions reports={reports} />
        {messages.length > 0 && (
          <ul style={{ ...text.header, color: colors.text }}>
            {messages.map((message) => (
              <li key={message.id}>{message.text}</li>
            ))}
          </ul>
        )}
      </footer>
    </div>
  );
}
