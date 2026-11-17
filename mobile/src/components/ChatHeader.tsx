import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";

// The top of the station's chat (MET-A-029, #335): who the steward writes
// to, from which station, and Luk. While the chat is open (closed is false)
// the station shows as arrived, with the reminder that what is critical goes
// over the radio.
export function ChatHeader({
  station,
  closed,
  onClose,
}: {
  station: string | undefined;
  closed: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">
            Kontrolrum
          </Text>
          <View style={styles.subRow}>
            {!closed && <View style={styles.onlineDot} />}
            <Text style={styles.subtitle}>
              {closed ? station : `${station} · Ankommet`}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Luk chatten"
          onPress={onClose}
          style={styles.close}
        >
          <Text style={styles.closeText}>Luk</Text>
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path
              d="M9 5l7 7-7 7"
              stroke={colors.text}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
      </View>

      {/* The radio stays for what is critical (MET-A-029). */}
      {!closed && (
        <View style={styles.radio}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={10} fill={colors.text} />
            <Rect
              x={10.8}
              y={6}
              width={2.4}
              height={8}
              fill={colors.background}
            />
            <Rect
              x={10.8}
              y={16}
              width={2.4}
              height={2.4}
              fill={colors.background}
            />
          </Svg>
          <Text style={styles.radioText}>Kritisk? Brug radioen.</Text>
        </View>
      )}
    </>
  );
}

// Shown instead of the messages when the chat closed while it was open:
// the steward checked out or the scenario was stood down.
export function ChatClosedNotice({
  reason,
  onBack,
}: {
  reason: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.closedWrap}>
      <View style={styles.closedBox} accessibilityRole="alert">
        <Text style={styles.closedTitle}>Chatten er lukket</Text>
        <Text style={styles.closedText}>{reason}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.back}
        >
          <Text style={styles.backText}>TILBAGE TIL OVERSIGT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomColor: steward.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.medium,
    paddingHorizontal: spacing.large,
    paddingVertical: spacing.medium,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...text.header,
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  subRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    backgroundColor: steward.green,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  subtitle: {
    color: steward.muted,
    fontSize: 13,
  },
  close: {
    alignItems: "center",
    borderColor: colors.text,
    borderRadius: panelRadius,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: spacing.medium,
  },
  closeText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  radio: {
    alignItems: "center",
    backgroundColor: steward.strip,
    borderRadius: panelRadius,
    flexDirection: "row",
    gap: 8,
    marginHorizontal: spacing.large,
    marginTop: spacing.medium,
    paddingHorizontal: spacing.medium,
    paddingVertical: 10,
  },
  radioText: {
    color: colors.text,
    fontSize: 14,
  },
  closedWrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.large,
  },
  closedBox: {
    borderColor: colors.text,
    borderRadius: panelRadius,
    borderWidth: 2,
    gap: spacing.medium,
    padding: spacing.large,
  },
  closedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  closedText: {
    color: colors.text,
    fontSize: 15,
    textAlign: "center",
  },
  back: {
    alignItems: "center",
    backgroundColor: steward.black,
    borderRadius: panelRadius,
    justifyContent: "center",
    minHeight: steward.slideHeight,
  },
  backText: {
    ...text.button,
    letterSpacing: 1,
  },
});
