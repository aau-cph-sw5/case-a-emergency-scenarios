import { useEffect, useState } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import type { Session } from "../../shared/auth/login";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import { OperatorDashboard } from "./OperatorDashboard";
import { socket } from "./socket";
import { useActiveActivations } from "./useActiveActivations";

// The control-room dashboard. Stewards use the app in mobile/.
export function App() {
  // Kept in memory only: reloading the page asks for a new login.
  const [session, setSession] = useState<Session | null>(null);

  if (session === null) {
    return (
      // "" makes the login call go to /api, which vite.config forwards.
      <LoginScreen
        apiBaseUrl=""
        allowedRole="OPERATOR"
        wrongRoleMessage="Stewards logger ind i appen."
        onLoggedIn={setSession}
      />
    );
  }
  return (
    <ControlRoom token={session.token} onLogout={() => setSession(null)} />
  );
}

function ControlRoom({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // One socket per login, shared by the banner and the dashboard.
  useEffect(() => {
    socket.auth = { token };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [token]);

  const activations = useActiveActivations(token);

  // The banner sits outside any view, so every view added below it keeps it.
  return (
    <>
      <ActiveScenarioBanner {...activations} />
      <OperatorDashboard
        token={token}
        activation={activations.active[0]}
        onLogout={onLogout}
      />
    </>
  );
}
