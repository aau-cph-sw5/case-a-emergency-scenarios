import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useSocketState } from "../shared/socket/useSocketState";
import { apiBaseUrl } from "./src/api-base-url";
import { socket } from "./src/socket";

type HealthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; ok: boolean };

export default function App() {
  const [state, setState] = useState<HealthState>({ status: "loading" });
  const { isConnected, messages } = useSocketState(socket);

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

        <Text style={isConnected ? styles.ok : styles.offline}>
          Socket: {isConnected ? "connected" : "disconnected"}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => (isConnected ? socket.disconnect() : socket.connect())}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {isConnected ? "Disconnect socket" : "Connect socket"}
          </Text>
        </Pressable>

        {messages.map((message) => (
          <Text key={message.id}>Socket: {message.text}</Text>
        ))}

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
  offline: {
    color: "#6b7280",
    marginTop: 8,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#1b7f3b",
    borderRadius: 4,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
