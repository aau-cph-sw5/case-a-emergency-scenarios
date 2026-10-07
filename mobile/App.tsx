import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, apiBaseUrl } from "./api";

type HealthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ok: boolean };

export default function App() {
  const [state, setState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    api
      .fetchHealth()
      .then((health) => {
        if (!cancelled) setState({ status: "ready", ok: health.ok });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Emergency Scenarios</Text>

        <Text>Server: {apiBaseUrl}</Text>

        {state.status === "loading" && <Text>Checking server…</Text>}

        {state.status === "error" && (
          <Text style={styles.error}>
            Could not reach the server: {state.message}. Is it running (npm run
            dev)?
          </Text>
        )}

        {state.status === "ready" && (
          <Text style={state.ok ? styles.ok : styles.error}>
            {state.ok ? "Server is healthy" : "Server reports a problem"}
          </Text>
        )}

        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e0dcdc",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },
  ok: {
    color: "#1b7f3b",
    fontWeight: "600",
    marginTop: 8,
  },
  error: {
    color: "#b00020",
    marginTop: 8,
  },
});
