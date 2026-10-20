import { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { useActivatedScenario } from "../../../shared/socket/useActivatedScenario";
import { socket } from "../socket";
import { RoleView } from "./RoleView";
import { sendPositionReport } from "../api/position-report";
import { currentStations } from "../../../shared/components/stationState";
import { StationPicker } from "../components/StationPicker";

export function StewardView({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // Data from the socketstate
  const { isConnected, messages } = useSocketState(socket);
  const activated = useActivatedScenario(socket);
  const [station, setStation] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // A new scenario arriving with a new scenarioid clears the old station choice.
  const scenarioId = activated?.scenario.scenarioId;
  useEffect(() => {
    setStation("");
    setReportStatus(null);
  }, [scenarioId]);


  // The stations of the activated scenario's current version, for the picker.
  const stations = activated ? currentStations(activated.scenario) : [];

  // Reports the chosen station and shows the answer.
  async function reportPosition() {
    if (station === "") return;
    setReportStatus(await sendPositionReport(token, station));
  }

  return (
    <RoleView
      title="Steward"
      description="Logget ind som steward."
      onLogout={onLogout}
    >
      {activated ? (
        <>
          <Text style={styles.scenario}>
            Aktivt scenarie: {activated.scenario.name}
          </Text>

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
      ) : (
        <Text style={styles.noScenario}>Intet aktivt scenarie</Text>
      )}

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
    </RoleView>
  );
}

const styles = StyleSheet.create({
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
  scenario: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
    marginTop: 12,
  },
  noScenario: {
    color: "#6b7280",
    fontSize: 18,
    marginBottom: 8,
  },
});
