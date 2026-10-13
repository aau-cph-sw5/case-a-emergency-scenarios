import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { page } from "../shared/Theme";
import type { Session } from "../shared/auth/login";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OperatorDashboard } from "./src/screens/OperatorDashboard";
import { StewardView } from "./src/screens/StewardView";

export default function App() {
  // Kept in memory only: reloading the app asks for a new login.
  const [session, setSession] = useState<Session | null>(null);

  const logout = () => setSession(null);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {session === null && <LoginScreen onLoggedIn={setSession} />}
        {session?.role === "STEWARD" && <StewardView onLogout={logout} />}
        {session?.role === "OPERATOR" && (
          <OperatorDashboard onLogout={logout} />
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
