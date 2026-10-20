import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { socket } from "../socket";
import { RoleView } from "./RoleView";
import { REQUEST_TIMEOUT_MS } from "../../../shared/http";
import { apiBaseUrl } from "../api-base-url";
import { ERROR_CODES } from "../../../shared/error-codes";

// What the steward reads for each refusal; the server's message is for developers.
const REPORT_ERRORS: Record<string, string> = {
  [ERROR_CODES.AUTH_TOKEN_INVALID]: "Din session er udløbet. Log ind igen.",
  [ERROR_CODES.ROLE_NOT_PERMITTED]: "Kun stewards kan rapportere en position.",
  [ERROR_CODES.NO_ACTIVE_SCENARIO]: "Der er ikke noget aktivt scenarie.",
  [ERROR_CODES.STATION_NOT_IN_SCENARIO]:
    "Stationen er ikke en del af det aktive scenarie.",
};

export function StewardView({ token, onLogout }: { token: string; onLogout: () => void }) {
  // Socket demo from MET-A-004, shown once the steward is logged in.
  const { isConnected, messages, activated } = useSocketState(socket);
  const [station, setStation] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // The stations of the activated scenario's current version, for the picker.
  const version = activated?.scenario.versions.find(
    (v) => v.version === activated.scenario.currentVersion,
  );
  const stations = version?.stationRequirements.map((r) => r.station) ?? [];

  // Sends the chosen station over HTTP; the server forwards it to the operators with sockets afterwards.
  async function reportPosition() {
    if (station === "") return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/position-reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ staff: "", station, reportedAt: new Date().toISOString() }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        setReportStatus(`Position sendt: ${station}`);
        return;
      }
      const body = await response.json().catch(() => null);
      setReportStatus(
        REPORT_ERRORS[body?.error?.code] ?? "Positionen blev ikke modtaget.",
      );
    } catch {
      setReportStatus("Ingen forbindelse til serveren.");
    }
  }

  return (
    <RoleView
      title="Steward"
      description="Logget ind som steward."
      onLogout={onLogout}
    >
      {activated && (
        <Text style={styles.scenario}>
          Aktivt scenarie: {activated.scenario.name}
        </Text>
      )}
      <Text style={styles.label}>Vælg station</Text>
      <Picker
        selectedValue={station}
        onValueChange={(value) => setStation(value)}
        style={styles.picker}
      >
        <Picker.Item label="Vælg station…" value="" />
        {stations.map((name) => (
          <Picker.Item key={name} label={name} value={name} />
        ))}
      </Picker>
      {station !== "" && <Text>Valgt: {station}</Text>}
      
      <Pressable
        accessibilityRole="button"
        onPress={reportPosition}
        disabled={station === ""}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Rapportér position</Text>
      </Pressable>
      {reportStatus && <Text>{reportStatus}</Text>}

      
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
picker: {
  marginBottom: 8,
},
});
