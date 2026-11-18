import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, surface, text } from "../../../shared/Theme";
import { MetroLogo } from "../components/MetroLogo";

// The header of a logged-in view (#376), one row as in the prototype: who is
// logged in on the left, Metro's logo in the middle and "Log ud" on the
// right. The scenario and the connection are shown in the status card, as the
// context of the status. The view's own content goes in children.
export function RoleView({
  title,
  onLogout,
  children,
}: {
  title: string;
  onLogout: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* The two sides take the same width, so the logo stays in the middle
            of the phone whatever the texts' widths. */}
        <View style={styles.side}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <MetroLogo height={26} />
        <View style={[styles.side, styles.end]}>
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
  },
  side: {
    flex: 1,
  },
  end: {
    alignItems: "flex-end",
  },
  title: {
    ...text.header,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
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
