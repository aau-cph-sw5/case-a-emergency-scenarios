import { Pressable, StyleSheet, Text } from "react-native";
import { useSocketState } from "../../../shared/socket/useSocketState";
import { colors, palette, text } from "../../../shared/Theme";
import { useActiveScenario } from "../offline/useActiveScenario";
import { socket } from "../socket";
import { OfflineBanner } from "./OfflineBanner";
import { RoleView } from "./RoleView";
import { ScenarioSummary } from "./ScenarioSummary";

// token is null when the app opened without network and shows the saved copy
// by itself; there is nothing to log out of then.
export function StewardView({
  token,
  online,
  onLogout,
}: {
  token: string | null;
  online: boolean | null;
  onLogout?: () => void;
}) {
  const view = useActiveScenario(token, online);
  // Socket demo from MET-A-004, shown once the steward is logged in.
  const { isConnected, messages } = useSocketState(socket);

  return (
    <RoleView
      title="Steward"
      description={
        token === null
          ? "Gemt kopi, ikke logget ind."
          : "Logget ind som steward."
      }
      onLogout={onLogout}
    >
      {view.status === "loading" && (
        <Text style={styles.message}>Henter aktiv hændelse…</Text>
      )}
      {view.status === "none" && (
        <Text style={styles.message}>Ingen aktiv hændelse lige nu.</Text>
      )}
      {view.status === "unavailable" && (
        <Text style={styles.error} accessibilityRole="alert">
          {view.message}
        </Text>
      )}
      {view.status === "copy" && (
        <OfflineBanner savedAt={view.snapshot.savedAt} reason={view.reason} />
      )}
      {(view.status === "live" || view.status === "copy") && (
        <ScenarioSummary snapshot={view.snapshot} />
      )}

      {token !== null && (
        <>
          <Text style={isConnected ? styles.ok : styles.disconnected}>
            Socket: {isConnected ? "connected" : "disconnected"}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              isConnected ? socket.disconnect() : socket.connect()
            }
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
    </RoleView>
  );
}

const styles = StyleSheet.create({
  message: {
    ...text.body,
    color: colors.text,
    marginTop: 8,
  },
  error: {
    color: palette.metroDeepRed,
    marginTop: 8,
  },
  ok: {
    color: palette.metroLineOne,
    fontWeight: "600",
    marginTop: 16,
  },
  disconnected: {
    color: colors.text,
    opacity: 0.6,
    marginTop: 16,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: palette.metroLineOne,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: "600",
  },
});
