import { useSocketState } from "../../shared/socket/useSocketState";
import { ScenarioList } from "./ScenarioList";
import { socket } from "./socket";

export function App() {
  const { isConnected, messages } = useSocketState(socket);

  return (
    <main>
      <h1>Emergency Scenarios</h1>
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

      <ScenarioList />
    </main>
  );
}
