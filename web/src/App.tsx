import { useEffect, type ReactNode } from "react";
import { operatorCssVars } from "../../shared/Theme";
import { LoginScreen } from "../../shared/LoginScreen";
import { useSession } from "../../shared/auth/use-session";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";
import { LiveDataProvider } from "./data/liveData";
import { OperatorDashboard } from "./OperatorDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { webSessionStore } from "./auth/session-store";
import { socket } from "./socket";

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
    return <AuthNotice>Indlæser session…</AuthNotice>;
  }

  if (state.status === "signed-out") {
    if (logoutStorageError) {
      return (
        <AuthNotice>
          <p>
            Den gemte session kunne ikke fjernes. Du kan blive logget ind igen,
            hvis siden genstartes. Prøv at logge ud igen.
          </p>
          <button onClick={() => void retryLogout()} type="button">
            Prøv igen
          </button>
        </AuthNotice>
      );
    }
    return (
      <div className="login-page" style={operatorCssVars}>
        <LoginScreen apiBaseUrl="" client="web" onLoggedIn={completeLogin} />
      </div>
    );
  }

  if (state.status === "unavailable") {
    return (
      <AuthNotice>
        <p>Kan ikke bekræfte din session uden forbindelse.</p>
        <div className="auth-notice-actions">
          <button onClick={() => void restore()} type="button">
            Prøv igen
          </button>
          <button
            className="auth-notice-secondary"
            onClick={() => void signOut()}
            type="button"
          >
            Log ud
          </button>
        </div>
      </AuthNotice>
    );
  }

  if (state.session.role === "ADMIN") {
    return (
      <AdminDashboard
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

  return <AuthNotice>Denne konto har ikke adgang til webappen.</AuthNotice>;
}

// The plain screens before and instead of the dashboard (restoring the session,
// no connection, no access): a white card on the tunnel photo, like the login.
function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <main className="auth-notice" style={operatorCssVars}>
      <div className="auth-notice-card">{children}</div>
    </main>
  );
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
