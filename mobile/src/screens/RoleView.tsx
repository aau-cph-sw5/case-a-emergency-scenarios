import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, steward, surface, text } from "../../../shared/Theme";

// The header of a logged-in view (#376), one row as in the prototype: who is
// logged in, a dot for the live connection with the active scenario's name,
// and "Log ud". The view's own content goes in children.
export function RoleView({
  title,
  scenario,
  connected = false,
  onLogout,
  children,
}: {
  title: string;
  // The active scenario's name, left out when there is none.
  scenario?: string;
  // Green dot when live updates arrive, red when they do not.
  connected?: boolean;
  onLogout: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {scenario !== undefined && (
          <View
            style={styles.scenario}
            accessible
            accessibilityLabel={`${scenario}, ${connected ? "forbundet" : "ingen forbindelse"}`}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: connected ? steward.green : steward.red },
              ]}
            />
            <Text style={styles.scenarioName} numberOfLines={1}>
              {scenario}
            </Text>
          </View>
        )}
        <Pressable
          style={styles.button}
          onPress={onLogout}
          accessibilityRole="button"
        >
          <Svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9" />
          </Svg>
          <Text style={styles.buttonText}>Log ud</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...surface,
    flex: 1,
    padding: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  title: {
    ...text.header,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  scenario: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 6,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  scenarioName: {
    color: steward.muted,
    flexShrink: 1,
    fontSize: 12,
  },
  button: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
