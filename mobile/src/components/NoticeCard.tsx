import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { steward } from "../../../shared/Theme";

// The face the status card turns to when the scenario is stood down: the
// whole card is red and holds a warning sign and the message, nothing else
// (no station, no map, no control). It stays until the steward presses the
// cross in the top right corner. It sits inside the status card, so the
// card's own turn (Swap) brings it in.
export function NoticeCard({
  title,
  text,
  onDismiss,
}: {
  title: string;
  text: string;
  onDismiss: () => void;
}) {
  const colour = steward.card.stoodDown.text;
  return (
    <View style={styles.card} accessibilityRole="alert">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Luk"
        hitSlop={12}
        onPress={onDismiss}
        style={styles.close}
      >
        <Svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colour}
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <Path d="M6 6l12 12M18 6 6 18" />
        </Svg>
      </Pressable>
      <Svg
        width={40}
        height={40}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colour}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M12 3 2 20h20L12 3ZM12 10v4M12 17.2v.1" />
      </Svg>
      <Text style={[styles.title, { color: colour }]}>{title}</Text>
      <Text style={[styles.text, { color: colour }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  close: { position: "absolute", right: 16, top: 16 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center" },
  text: { fontSize: 16, textAlign: "center" },
});
