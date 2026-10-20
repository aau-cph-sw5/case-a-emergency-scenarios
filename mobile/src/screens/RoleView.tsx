import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { box, colors, surface, text } from "../../../shared/Theme";

// Header with title and, when logged in, "Log ud"; the view's own content goes
// in children.
export function RoleView({
  title,
  description,
  onLogout,
  children,
}: {
  title: string;
  description: string;
  onLogout?: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onLogout && (
          <Pressable
            style={styles.button}
            onPress={onLogout}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Log ud</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.description}>{description}</Text>
      {children}
    </View>
  );
}

// Styling comes from shared/Theme so the views match the control-room
// dashboard.
const styles = StyleSheet.create({
  container: {
    ...surface,
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    ...text.header,
    color: colors.text,
  },
  description: {
    ...text.body,
    color: colors.text,
  },
  button: {
    ...box,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
  },
  buttonText: {
    color: colors.text,
  },
});
