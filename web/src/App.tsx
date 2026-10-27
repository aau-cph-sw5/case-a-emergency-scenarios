import { useEffect } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import { useSession } from "../../shared/auth/use-session";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import { LiveDataProvider } from "./data/liveData";
import { OperatorDashboard } from "./OperatorDashboard";
import { webSessionStore } from "./auth/session-store";
import { socket } from "./socket";

// The control-room dashboard. Stewards use the app in mobile/.
export function App() {
  const { state, completeLogin, restore, signOut } = useSession({
    // "" makes API calls go to /api, which vite.config forwards.
    apiBaseUrl: "",
    allowedRole: "OPERATOR",
    store: webSessionStore,
  });

  useEffect(() => {
    const revalidate = () => void restore();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    };

    window.addEventListener("online", revalidate);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("online", revalidate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [restore]);

  // One socket per login, shared by the banner and the dashboard.
  const token = state.status === "signed-in" ? state.session.token : undefined;
  useEffect(() => {
    if (token === undefined) return;
    socket.auth = { token };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [token]);

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

  // The banner sits outside any view, so every view added below it keeps it.
  // LiveDataProvider loads the server data once for both.
  return (
    <LiveDataProvider socket={socket} token={state.session.token}>
      <ActiveScenarioBanner />
      <OperatorDashboard
        token={state.session.token}
        onLogout={() => void signOut()}
      />
    </LiveDataProvider>
  );
}
