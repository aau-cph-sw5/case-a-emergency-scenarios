import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  colors,
  controlRoomControlRadius,
  controlRoomPanelRadius,
  palette,
  text,
} from "./Theme";
import { InvalidCredentialsError, login } from "./auth/login";
import type { Client } from "./auth/client-access";
import type { Session } from "./auth/session";

// The dashboard's font on the web; Android and iOS use the system font.
const font = Platform.select({ web: "Arial, Helvetica, sans-serif" });

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
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.brandMark} aria-hidden>
          M
        </Text>
        <Text style={styles.brandName}>Metro Service</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title} role="heading">
          Emergency Scenarios
        </Text>

        <Text style={styles.label} nativeID="login-username">
          Brugernavn
        </Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={!submitting}
          aria-labelledby="login-username"
        />

        <Text style={styles.label} nativeID="login-password">
          Adgangskode
        </Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!submitting}
          onSubmitEditing={() => void handleSubmit()}
          aria-labelledby="login-password"
        />

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
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

// The login looks like the control-room dashboard: the brand above a white
// panel on the dark page. Colours and corners come from shared/Theme.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.controlRoomPage,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  brandMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brand,
    color: colors.textInverse,
    fontFamily: font,
    fontSize: 24,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
    overflow: "hidden",
  },
  brandName: {
    color: colors.textInverse,
    fontFamily: font,
    fontSize: 19,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: controlRoomPanelRadius,
    paddingHorizontal: 24,
    paddingVertical: 28,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  title: {
    color: colors.text,
    fontFamily: font,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 24,
  },
  label: {
    color: colors.textMuted,
    fontFamily: font,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: controlRoomControlRadius,
    color: colors.text,
    fontFamily: font,
    paddingHorizontal: 12,
    paddingVertical: 10,
    // 16px keeps iOS from zooming in on focus.
    fontSize: 16,
    marginBottom: 18,
  },
  button: {
    backgroundColor: colors.controlRoomAction,
    borderRadius: controlRoomControlRadius,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    ...text.button,
    fontFamily: font,
  },
  error: {
    color: palette.metroDeepRed,
    fontFamily: font,
    marginTop: 14,
  },
});
