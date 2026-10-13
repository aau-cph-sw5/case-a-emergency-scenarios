import { useEffect, useState } from "react";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string) ?? "";
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
const apiBaseUrl = devHost
  ? apiUrl.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${devHost}`)
  : apiUrl;

type HealthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ok: boolean };

export default function App() {
  const [state, setState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/healthcheck`, { signal: controller.signal })
      .then((response) => response.json() as Promise<{ ok: boolean }>)
      .then((health) => setState({ status: "ready", ok: health.ok }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => controller.abort();
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
    backgroundColor: "#010000",
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
