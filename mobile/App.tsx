import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "../shared/LoginScreen";
import { page } from "../shared/Theme";
import { useSession } from "../shared/auth/use-session";
import { apiBaseUrl } from "./src/api-base-url";
import { mobileSessionStore } from "./src/auth/session-store";
import { snapshotStore } from "./src/offline/snapshot-store";
import { useConnectivity } from "./src/offline/useConnectivity";
import { StewardView } from "./src/screens/StewardView";

// The steward app. Operators use the control-room dashboard in web/.
export default function App() {
  const { state, completeLogin, restore, signOut } = useSession({
    apiBaseUrl,
    allowedRole: "STEWARD",
    store: mobileSessionStore,
  });
  const online = useConnectivity();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void restore();
      }
    });

    return () => subscription.remove();
  }, [restore]);

  // A session that could not be confirmed offline is confirmed as soon as
  // the connection returns (MET-A-005).
  useEffect(() => {
    if (online === true && state.status === "unavailable") {
      void restore();
    }
  }, [online, state.status, restore]);

  // A signed-out phone keeps no scenario data, however the session ended:
  // logging out, or a token the server no longer accepts. The steward view
  // has closed by then, so a fetch still in flight cannot save the copy again.
  useEffect(() => {
    if (state.status === "signed-out") {
      void snapshotStore.clear().catch(() => undefined);
    }
  }, [state.status]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {state.status === "restoring" && (
          <View style={styles.status}>
            <ActivityIndicator />
            <Text>Indlæser session…</Text>
          </View>
        )}

        {state.status === "signed-out" && (
          <LoginScreen
            apiBaseUrl={apiBaseUrl}
            allowedRole="STEWARD"
            onLoggedIn={completeLogin}
          />
        )}

        {/* Without a connection the session cannot be confirmed, so the
            steward reads the saved copy until it can (MET-A-005). */}
        {(state.status === "signed-in" || state.status === "unavailable") && (
          <StewardView
            token={state.session.token}
            online={state.status === "signed-in" && online !== false}
            onLogout={() => void signOut()}
            onUnauthorized={() => void restore()}
            onRetry={
              state.status === "unavailable" ? () => void restore() : undefined
            }
          />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    ...page,
  },
  status: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
});
