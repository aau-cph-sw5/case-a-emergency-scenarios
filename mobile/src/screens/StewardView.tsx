import { Pressable, StyleSheet, Text } from "react-native";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { socket } from "../socket";
import { RoleView } from "./RoleView";

export function StewardView({ onLogout }: { onLogout: () => void }) {
  // Socket demo from MET-A-004, shown once the steward is logged in.
  const { isConnected, messages, activated } = useSocketState(socket);

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
});
