import { useEffect } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import { useSession } from "../../shared/auth/use-session";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";
import { LiveDataProvider } from "./data/liveData";
import { OperatorDashboard } from "./OperatorDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { AnalystDashboard } from "./AnalystDashboard";
import { webSessionStore } from "./auth/session-store";
import { socket } from "./socket";

// The web app: Dashboards for operators, admins and analysts.
// Stewards use the app in mobile/.
export function App() {
  const {
    state,
    completeLogin,
    restore,
    signOut,
    logoutStorageError,
    retryLogout,
  } = useSession({
    // "" makes API calls go to /api, which vite.config forwards.
    apiBaseUrl: "",
    client: "web",
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

  // The operator's socket is shared by the banner and dashboard.
  const token =
    (state.status === "signed-in" || state.status === "unavailable") &&
    state.session.role === "OPERATOR"
      ? state.session.token
      : undefined;
  useAuthenticatedSocket(socket, token, restore);

  if (state.status === "restoring") {
    return <main>Indlæser session…</main>;
  }

  if (state.status === "signed-out") {
    if (logoutStorageError) {
      return (
        <main>
          <p>
            Den gemte session kunne ikke fjernes. Du kan blive logget ind igen,
            hvis siden genstartes. Prøv at logge ud igen.
          </p>
          <button onClick={() => void retryLogout()} type="button">
            Prøv igen
          </button>
        </main>
      );
    }
    return (
      <div className="login-page">
        <LoginScreen apiBaseUrl="" client="web" onLoggedIn={completeLogin} />
      </div>
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

  if (state.session.role === "ADMIN") {
    return <AdminDashboard onLogout={() => void signOut()} />;
  }

  if (state.session.role === "ANALYST") {
    return (
      <AnalystDashboard
        token={state.session.token}
        onLogout={() => void signOut()}
      />
    );
  }

  if (state.session.role === "OPERATOR") {
    return (
      <ControlRoom
        token={state.session.token}
        onLogout={() => void signOut()}
      />
    );
  }

  return <main>Denne konto har ikke adgang til webappen.</main>;
}

function ControlRoom({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // The header banner and dashboard share one live-data provider.
  return (
    <LiveDataProvider socket={socket} token={token}>
      <OperatorDashboard token={token} onLogout={onLogout} />
    </LiveDataProvider>
  );
}
