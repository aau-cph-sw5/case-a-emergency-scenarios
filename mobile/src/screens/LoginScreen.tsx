import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { apiBaseUrl } from "../api-base-url";
import { InvalidCredentialsError, login } from "../auth/login";
import type { Session } from "../auth/login";
import {
  box,
  colors,
  palette,
  radius,
  surface,
  text,
} from "../../../shared/Theme";

type Reachability = "checking" | "reachable" | "unreachable";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

export function LoginScreen({
  onLoggedIn,
}: {
  onLoggedIn: (session: Session) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>({ status: "idle" });
  const [reachability, setReachability] = useState<Reachability>("checking");

  // Any HTTP answer means the server is reachable. The stub has no
  // /healthcheck route and answers 404, which still counts.
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/healthcheck`, { signal: controller.signal })
      .then(() => setReachability("reachable"))
      .catch(() => {
        if (controller.signal.aborted) return;
        setReachability("unreachable");
      });

    return () => controller.abort();
  }, []);

  const submitting = state.status === "submitting";
  const canSubmit = !submitting && username.trim() !== "" && password !== "";

  async function handleSubmit() {
    if (!canSubmit) return;
    setState({ status: "submitting" });
    try {
      const session = await login(apiBaseUrl, username.trim(), password);
      onLoggedIn(session);
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
      <View style={styles.card}>
        <Text style={styles.title}>Emergency Scenarios</Text>

        <Text style={styles.label}>Brugernavn</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          editable={!submitting}
        />

        <Text style={styles.label}>Adgangskode</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!submitting}
          onSubmitEditing={() => void handleSubmit()}
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

        <Text style={styles.health}>
          Server: {apiBaseUrl}
          {reachability === "checking" && " · tjekker…"}
          {reachability === "reachable" && " · forbundet"}
          {reachability === "unreachable" && " · kan ikke nås"}
        </Text>
      </View>
    </View>
  );
}

// Styling comes from shared/Theme so the login matches the control-room
// dashboard.
const styles = StyleSheet.create({
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
  health: {
    color: colors.text,
    opacity: 0.6,
    fontSize: 12,
    marginTop: 24,
  },
});
