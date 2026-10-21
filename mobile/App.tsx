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
import { apiBaseUrl } from "./src/api-base-url";
import { mobileSessionStore } from "./src/auth/session-store";
import { StewardView } from "./src/screens/StewardView";

// The steward app. Operators use the control-room dashboard in web/.
export default function App() {
  const { state, completeLogin, restore, signOut } = useSession({
    apiBaseUrl,
    allowedRole: "STEWARD",
    store: mobileSessionStore,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void restore();
      }
    });

    return () => subscription.remove();
  }, [restore]);

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

        {state.status === "unavailable" && (
          <View style={styles.status}>
            <Text>Kan ikke bekræfte din session uden forbindelse.</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => void restore()}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Prøv igen</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => void signOut()}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Log ud</Text>
            </Pressable>
          </View>
        )}

        {state.status === "signed-in" && (
          <StewardView
            token={state.session.token}
            onLogout={() => void signOut()}
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
