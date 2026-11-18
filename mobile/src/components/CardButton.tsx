import { Pressable, StyleSheet, Text } from "react-native";
import { colors, panelRadius, steward, text } from "../../../shared/Theme";

// THE button in the status card (#376), as tall as a slide and with the same
// corners, so a button and a slide can take each other's place. Two kinds:
// - "wide": a white button across the card with a word, for example TJEK UD;
// - "cross": a square grey ✕ next to a slide, which steps away from it (it
//   cancels the assignment next to CHECK IND, and goes back next to a red
//   slide).
export function CardButton({
  kind,
  label,
  accessibilityLabel,
  disabled = false,
  onPress,
}: {
  kind: "wide" | "cross";
  // The word on a wide button; a cross shows ✕.
  label?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        kind === "wide" ? styles.wide : styles.cross,
        disabled && styles.disabled,
      ]}
    >
      <Text style={kind === "wide" ? styles.wideText : styles.crossText}>
        {kind === "wide" ? label : "✕"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: panelRadius,
    height: steward.slideHeight,
    justifyContent: "center",
  },
  wide: {
    backgroundColor: colors.background,
  },
  cross: {
    backgroundColor: steward.strip,
    width: steward.slideHeight,
  },
  wideText: {
    ...text.button,
    color: colors.text,
    letterSpacing: 1,
  },
  crossText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
});
