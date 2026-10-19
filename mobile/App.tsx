import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "../shared/LoginScreen";
import { page } from "../shared/Theme";
import type { Session } from "../shared/auth/login";
import { apiBaseUrl } from "./src/api-base-url";
import { snapshotStore } from "./src/offline/snapshot-store";
import { useConnectivity } from "./src/offline/useConnectivity";
import { StewardView } from "./src/screens/StewardView";

// The steward app. Operators use the control-room dashboard in web/.
export default function App() {
  // Kept in memory only: reloading the app asks for a new login.
  const [session, setSession] = useState<Session | null>(null);
  const online = useConnectivity();
  // Whether a saved copy of an active scenario is on the phone (MET-A-005).
  const [hasSavedCopy, setHasSavedCopy] = useState(false);

  useEffect(() => {
    if (session !== null) return;
    let cancelled = false;
    snapshotStore.load().then(
      (copy) => {
        if (!cancelled) setHasSavedCopy(copy !== null);
      },
      () => {
        if (!cancelled) setHasSavedCopy(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [session, online]);

  function content() {
    if (session !== null) {
      return (
        <StewardView
          token={session.token}
          online={online}
          onLogout={() => setSession(null)}
        />
      );
    }
    // Without network the steward cannot log in, so the saved copy opens by
    // itself. When the network is back, the login screen returns.
    if (online === false && hasSavedCopy) {
      return <StewardView token={null} online={online} />;
    }
    return (
      <LoginScreen
        apiBaseUrl={apiBaseUrl}
        allowedRole="STEWARD"
        wrongRoleMessage="Operatører logger ind på web-dashboardet."
        onLoggedIn={setSession}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {content()}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    ...page,
  },
});
