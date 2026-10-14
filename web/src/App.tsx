import { useState } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import type { Session } from "../../shared/auth/login";
import { OperatorDashboard } from "./OperatorDashboard";

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

  return <OperatorDashboard onLogout={() => setSession(null)} />;
}
