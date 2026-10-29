import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "../shared/LoginScreen";
import { page } from "../shared/Theme";
import { useSession } from "../shared/auth/use-session";
import { useAuthenticatedSocket } from "../shared/socket/useAuthenticatedSocket";
import { apiBaseUrl } from "./src/api-base-url";
import { mobileSessionStore } from "./src/auth/session-store";
import { snapshotStore } from "./src/offline/snapshot-store";
import { useConnectivity } from "./src/offline/useConnectivity";
import { StewardView } from "./src/screens/StewardView";
import { socket } from "./src/socket";
import { useSessionNetworkRecovery } from "./src/useSessionNetworkRecovery";

// The steward app. Operators use the control-room dashboard in web/.
export default function App() {
  const {
    state,
    completeLogin,
    restore,
    signOut,
    logoutStorageError,
    retryLogout,
  } = useSession({
    apiBaseUrl,
    client: "mobile",
    store: mobileSessionStore,
  });
  const online = useConnectivity();

  const token =
    state.status === "signed-in" || state.status === "unavailable"
      ? state.session.token
      : undefined;

  useAuthenticatedSocket(socket, token, restore);
  useSessionNetworkRecovery(state.status !== "signed-out", restore);

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

        {state.status === "signed-out" && logoutStorageError && (
          <View style={styles.status}>
            <Text>
              Den gemte session kunne ikke fjernes. Du kan blive logget ind
              igen, hvis appen genstartes. Prøv at logge ud igen.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void retryLogout()}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Prøv igen</Text>
            </Pressable>
          </View>
        )}

        {state.status === "signed-out" && !logoutStorageError && (
          <LoginScreen
            apiBaseUrl={apiBaseUrl}
            client="mobile"
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
  button: {
    backgroundColor: "#1b7f3b",
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
