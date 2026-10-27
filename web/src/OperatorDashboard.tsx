import { socket } from "./socket";
import { useSocketState } from "../../shared/socket/useSocketState";
import { usePositionReports } from "../../shared/socket/usePositionReports";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ActiveStationList } from "./ActiveStationList";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";

// The control-room dashboard. App opens the socket.
export function OperatorDashboard({
  token,
  activation,
  loading,
  error,
  onLogout,
}: {
  token: string;
  activation: ScenarioState | undefined;
  loading: boolean;
  error: string | null;
  onLogout: () => void;
}) {
  const { messages } = useSocketState(socket);
  // Every position report pushed by the server over the socket, newest first.
  const reports = usePositionReports(socket);

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

      <ScenarioList token={token} />
      {error !== null ? (
        <p role="alert">Kunne ikke hente aktive scenarier: {error}</p>
      ) : loading ? (
        <p role="status">Henter aktive scenarier…</p>
      ) : activation === undefined ? (
        <p>Ingen aktive scenarier, så ingen stationer at vise.</p>
      ) : (
        <ActiveStationList
          key={activation.scenarioId}
          token={token}
          activation={activation}
        />
      )}
    </main>
  );
}
