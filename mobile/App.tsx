import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LoginScreen } from "../shared/LoginScreen";
import { page } from "../shared/Theme";
import type { Session } from "../shared/auth/login";
import { apiBaseUrl } from "./src/api-base-url";
import { StewardView } from "./src/screens/StewardView";

// The steward app. Operators use the control-room dashboard in web/.
export default function App() {
  // Kept in memory only: reloading the app asks for a new login.
  const [session, setSession] = useState<Session | null>(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {session === null ? (
          <LoginScreen
            apiBaseUrl={apiBaseUrl}
            allowedRole="STEWARD"
            wrongRoleMessage="Operatører logger ind på web-dashboardet."
            onLoggedIn={setSession}
          />
        ) : (
          <StewardView
            token={session.token}
            onLogout={() => setSession(null)}
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
});
