import { useState } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import type { Session } from "../../shared/auth/login";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import { OperatorDashboard } from "./OperatorDashboard";

// The control-room dashboard. Stewards use the app in mobile/.
export function App() {
  // Kept in memory only: reloading the page asks for a new login.
  const [session, setSession] = useState<Session | null>(null);
  // Bumped after an activation, so the banner refetches at once instead of
  // waiting for its next poll.
  const [activations, setActivations] = useState(0);

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
      <ActiveScenarioBanner token={session.token} refresh={activations} />
      <OperatorDashboard
        token={session.token}
        onLogout={() => setSession(null)}
        onActivated={() => setActivations((n) => n + 1)}
      />
    </>
  );
}
