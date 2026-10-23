import { useEffect, useState } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import type { Session } from "../../shared/auth/login";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import { OperatorDashboard } from "./OperatorDashboard";
import { socket } from "./socket";

// The control-room dashboard. Stewards use the app in mobile/.
export function App() {
  // Kept in memory only: reloading the page asks for a new login.
  const [session, setSession] = useState<Session | null>(null);

  // One socket per login, shared by the banner and the dashboard.
  const token = session?.token;
  useEffect(() => {
    if (token === undefined) return;
    socket.auth = { token };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [token]);

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

  // The banner sits outside any view, so every view added below it keeps it.
  return (
    <>
      <ActiveScenarioBanner token={session.token} />
      <OperatorDashboard
        token={session.token}
        onLogout={() => setSession(null)}
      />
    </>
  );
}
