import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import tunnelImage from "../mobile/assets/login-tunnel.jpg";
import { box, colors, palette, radius, surface, text } from "./Theme";
import { InvalidCredentialsError, login } from "./auth/login";
import type { Client } from "./auth/client-access";
import type { Session } from "./auth/session";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

// Shared by the steward app (mobile/) and the control-room dashboard (web/).
// The server denies accounts that do not have the role expected by this client.
export function LoginScreen({
  apiBaseUrl,
  client,
  onLoggedIn,
}: {
  apiBaseUrl: string;
  client: Client;
  onLoggedIn: (session: Session) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>({ status: "idle" });

  const submitting = state.status === "submitting";
  const canSubmit = !submitting && username.trim() !== "" && password !== "";

  async function handleSubmit() {
    if (!canSubmit) return;
    setState({ status: "submitting" });
    try {
      const session = await login(
        apiBaseUrl,
        username.trim(),
        password,
        client,
      );
      await onLoggedIn(session);
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof InvalidCredentialsError
            ? "Forkert brugernavn eller adgangskode"
            : `Kunne ikke nå serveren: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return (
    <View style={[styles.container, client === "web" && styles.webContainer]}>
      {client !== "web" && (
        <View style={styles.mobileBackground} pointerEvents="none">
          <Image
            source={
              typeof tunnelImage === "string"
                ? { uri: tunnelImage }
                : tunnelImage
            }
            style={styles.mobileImage}
            resizeMode="cover"
          />
          <View style={styles.mobileOverlay} />
        </View>
      )}
      <View style={[styles.card, styles.webCard]}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>M</Text>
          </View>
          <Text style={styles.brandName}>Metro Service</Text>
        </View>
        <Text style={[styles.title, styles.webTitle]}>Log ind</Text>

        <Text style={[styles.label, styles.webLabel]}>Brugernavn</Text>
        <TextInput
          style={[styles.input, styles.webInput]}
          accessibilityLabel="Brugernavn"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={!submitting}
        />

        <Text style={[styles.label, styles.webLabel]}>Adgangskode</Text>
        <TextInput
          style={[styles.input, styles.webInput]}
          accessibilityLabel="Adgangskode"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!submitting}
          onSubmitEditing={() => void handleSubmit()}
        />

        <Pressable
          style={[
            styles.button,
            styles.webButton,
            !canSubmit && styles.buttonDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Logger ind…" : "Log ind"}
          </Text>
        </Pressable>

        {state.status === "error" && (
          <Text style={styles.error} accessibilityRole="alert">
            {state.message}
          </Text>
        )}
      </View>
    </View>
  );
}

// Styling comes from shared/Theme so the login matches the control-room
// dashboard.
const styles = StyleSheet.create({
  mobileBackground: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mobileImage: { width: "100%", height: "100%" },
  mobileOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15, 20, 22, 0.72)",
  },
  webContainer: {
    minHeight: "100%",
    justifyContent: "center",
    paddingVertical: 32,
  },
  webCard: { borderWidth: 0, borderRadius: 12, padding: 32, maxWidth: 440 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e81919",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: { color: "#fff", fontSize: 23, fontWeight: "700" },
  brandName: { color: "#182127", fontSize: 17, fontWeight: "700" },
  webTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  webLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#34484e",
    marginBottom: 7,
  },
  webInput: {
    borderColor: "#cbd5d8",
    borderRadius: 8,
    backgroundColor: "#f7f9f9",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 18,
  },
  webButton: { backgroundColor: "#b42420", borderRadius: 8, marginTop: 4 },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    ...surface,
    ...box,
    padding: 24,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    ...text.title,
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    ...text.header,
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    ...box,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.action,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...text.button,
  },
  error: {
    color: palette.metroDeepRed,
    marginTop: 12,
  },
});
