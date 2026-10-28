import { useEffect } from "react";
import { LoginScreen } from "../../shared/LoginScreen";
import { useSession } from "../../shared/auth/use-session";
import { useAuthenticatedSocket } from "../../shared/socket/useAuthenticatedSocket";
import { ActiveScenarioBanner } from "./ActiveScenarioBanner";
import { OperatorDashboard } from "./OperatorDashboard";
import { webSessionStore } from "./auth/session-store";
import { socket } from "./socket";

// The control-room dashboard. Stewards use the app in mobile/.
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

  // One socket per login, shared by the banner and the dashboard.
  const token =
    state.status === "signed-in" || state.status === "unavailable"
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
      <LoginScreen apiBaseUrl="" client="web" onLoggedIn={completeLogin} />
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
  return (
    <>
      <ActiveScenarioBanner token={state.session.token} />
      <OperatorDashboard
        token={state.session.token}
        onLogout={() => void signOut()}
      />
    </>
  );
}
