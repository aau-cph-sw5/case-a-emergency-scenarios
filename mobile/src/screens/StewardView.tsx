import { useEffect, useState } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { currentStations } from "../../../shared/components/stationState";
import { NO_COPY_MESSAGES } from "../../../shared/offline/copy-reason";
import { useActiveScenario } from "../../../shared/offline/use-active-scenario";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { colors, palette, text } from "../../../shared/Theme";
import { apiBaseUrl } from "../api-base-url";
import { sendPositionReport } from "../api/position-report";
import { StationPicker } from "../components/StationPicker";
import { snapshotStore } from "../offline/snapshot-store";
import { socket } from "../socket";
import { OfflineBanner } from "./OfflineBanner";
import { RoleView } from "./RoleView";
import { ScenarioSummary } from "./ScenarioSummary";

// online is false when the phone has no connection or the session could not
// be confirmed; the saved copy is shown then, and nothing is sent.
export function StewardView({
  token,
  online,
  onLogout,
  onUnauthorized,
  onRetry,
}: {
  token: string;
  online: boolean;
  onLogout: () => void;
  onUnauthorized: () => void;
  // Tries the connection again; without it the scenario is fetched again.
  onRetry?: () => void;
}) {
  // Data from the socketstate
  const { isConnected, messages } = useSocketState(socket);
  const { view, refresh } = useActiveScenario({
    apiBaseUrl,
    token,
    online,
    store: snapshotStore,
    onUnauthorized,
  });
  const [station, setStation] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // Fetches again when the app returns to the foreground, and when the socket
  // announces an activation, so that is saved as the offline copy too
  // (MET-A-005).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const onActivated = () => void refresh();
    socket.on("scenario-activated", onActivated);
    return () => {
      subscription.remove();
      socket.off("scenario-activated", onActivated);
    };
  }, [refresh]);

  const live = view.status === "live" ? view.snapshot.scenario : null;

  // A new scenario arriving with a new scenarioid clears the old station choice.
  const scenarioId = live?.scenarioId;
  const [shownScenarioId, setShownScenarioId] = useState(scenarioId);
  if (scenarioId !== shownScenarioId) {
    setShownScenarioId(scenarioId);
    setStation("");
    setReportStatus(null);
  }

  // The stations of the active scenario's current version, for the picker.
  // Positions can only be reported while live.
  const stations = live ? currentStations(live) : [];

  // The server refuses a socket without a valid token and uses its role to
  // decide which events this socket gets.
  function toggleSocket() {
    if (isConnected) {
      socket.disconnect();
      return;
    }
    socket.auth = { token };
    socket.connect();
  }

  // Reports the chosen station and shows the answer.
  async function reportPosition() {
    if (station === "") return;
    setReportStatus(await sendPositionReport(token, station));
  }

  const retry = onRetry ?? (() => void refresh());

  return (
    <RoleView
      title="Steward"
      description="Logget ind som steward."
      onLogout={onLogout}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {view.status === "loading" && (
          <Text style={styles.message}>Henter aktiv hændelse…</Text>
        )}
        {view.status === "none" && (
          <Text style={styles.message}>Intet aktivt scenarie</Text>
        )}
        {view.status === "no-copy" && (
          <>
            <Text style={styles.error} accessibilityRole="alert">
              {NO_COPY_MESSAGES[view.reason]}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={styles.button}
            >
              <Text style={styles.buttonText}>Prøv igen</Text>
            </Pressable>
          </>
        )}
        {view.status === "copy" && (
          <OfflineBanner
            savedAt={view.snapshot.savedAt}
            reason={view.reason}
            onRetry={retry}
          />
        )}
        {(view.status === "live" || view.status === "copy") && (
          <ScenarioSummary snapshot={view.snapshot} />
        )}

        {online && (
          <>
            {stations.length > 0 && (
              <>
                <StationPicker
                  stations={stations}
                  selected={station}
                  onSelect={setStation}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={reportPosition}
                  disabled={station === ""}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Rapportér position</Text>
                </Pressable>
                {reportStatus && <Text>{reportStatus}</Text>}
              </>
            )}

            <Text style={isConnected ? styles.ok : styles.offline}>
              Socket: {isConnected ? "connected" : "disconnected"}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={toggleSocket}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isConnected ? "Disconnect socket" : "Connect socket"}
              </Text>
            </Pressable>

            {messages.map((message) => (
              <Text key={message.id}>Socket: {message.text}</Text>
            ))}
          </>
        )}
      </ScrollView>
    </RoleView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  message: {
    ...text.body,
    color: colors.text,
    fontSize: 18,
    marginBottom: 8,
  },
  error: {
    color: palette.metroDeepRed,
    fontWeight: "600",
    marginBottom: 4,
  },
  ok: {
    color: "#1b7f3b",
    fontWeight: "600",
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
