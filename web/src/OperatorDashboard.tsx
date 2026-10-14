import { useSocketState } from "../../shared/socket/useSocketState";
import { socket } from "./socket";

// Placeholder for the control-room dashboard (MET-A-007) until it is
// connected here. The socket demo is from MET-A-004.
export function OperatorDashboard({ onLogout }: { onLogout: () => void }) {
  const { isConnected, messages } = useSocketState(socket);

  return (
    <main>
      <h1>Emergency Scenarios</h1>
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
    </main>
  );
}
