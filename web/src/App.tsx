import { LoginScreen } from "../../shared/LoginScreen";
import { useSession } from "../../shared/auth/use-session";
import { OperatorDashboard } from "./OperatorDashboard";
import { webSessionStore } from "./auth/session-store";

// The control-room dashboard. Stewards use the app in mobile/.
export function App() {
  const { state, completeLogin, restore, signOut } = useSession({
    // "" makes API calls go to /api, which vite.config forwards.
    apiBaseUrl: "",
    allowedRole: "OPERATOR",
    store: webSessionStore,
  });

  if (state.status === "restoring") {
    return <main>Indlæser session…</main>;
  }

  if (state.status === "signed-out") {
    return (
      <LoginScreen
        apiBaseUrl=""
        allowedRole="OPERATOR"
        onLoggedIn={completeLogin}
      />
    );
  }

  if (state.status === "unavailable") {
    return (
      <main>
        <p>Kan ikke bekræfte din session uden forbindelse.</p>
        <button onClick={() => void restore()} type="button">
          Prøv igen
        </button>
        <button onClick={() => void signOut()} type="button">
          Log ud
        </button>
      </main>
    );
  }

  return (
    <OperatorDashboard
      token={state.session.token}
      onLogout={() => void signOut()}
    />
  );
}
