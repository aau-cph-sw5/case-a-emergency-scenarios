import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, apiBaseUrl, type ScenarioSummary } from "./api";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; scenarios: ScenarioSummary[] };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    api
      .fetchScenarios()
      .then((scenarios) => {
        if (!cancelled) setState({ status: "ready", scenarios });
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

        {state.status === "loading" && <Text>Loading scenarios…</Text>}

        {state.status === "error" && (
          <Text style={styles.error}>
            Could not load scenarios from {apiBaseUrl}: {state.message}. Is the
            server running (npm run stub) and is the phone on the same network?
          </Text>
        )}

        {state.status === "ready" && (
          <FlatList
            data={state.scenarios}
            keyExtractor={(scenario) => scenario.scenarioId}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowId}>{item.scenarioId}</Text>
                <Text>
                  {item.name} (version {item.currentVersion})
                </Text>
              </View>
            )}
          />
        )}

        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },
  error: {
    color: "#b00020",
  },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  rowId: {
    fontWeight: "600",
  },
});
