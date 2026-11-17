import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  colors,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";

// The time a message was written, as the steward's phone shows time.
function clock(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// One message in the station's chat (MET-A-029, #335). The station's messages
// are black on the right, the control room's Metro Deep Red on the left. Each
// has a word for who wrote it, so colour is not the only sign.
export function MessageBubble({
  fromStation,
  showSender,
  text: body,
  writtenAt,
}: {
  fromStation: boolean;
  // Only the first of several messages in a row from the same sender names
  // it; the screen reader name of each message always does.
  showSender: boolean;
  text: string;
  writtenAt: string;
}) {
  const time = clock(writtenAt);
  const sender = fromStation ? "Station" : "Kontrolrum";
  return (
    <View
      style={[styles.row, fromStation ? styles.right : styles.left]}
      accessible
      accessibilityLabel={`${sender}, ${time}: ${body}`}
    >
      {showSender && (
        <Text style={[styles.who, !fromStation && styles.controlWho]}>
          {fromStation ? "STATION" : "KONTROLRUM"}
        </Text>
      )}
      <View
        style={[
          styles.bubble,
          fromStation ? styles.stationBubble : styles.controlBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            fromStation ? styles.stationText : styles.controlText,
          ]}
        >
          {body}
        </Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

// Material Symbols' "error", filled, next to something that went wrong in
// the chat.
export function WarningIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 -960 960 960">
      <Path
        d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"
        fill={steward.nobody}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 4,
    maxWidth: "82%",
  },
  left: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
  },
  right: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
  },
  who: {
    ...text.label,
    color: colors.text,
    fontSize: 10,
  },
  controlWho: {
    color: steward.chat.controlRoom,
  },
  bubble: {
    borderRadius: panelRadius,
    paddingHorizontal: spacing.medium,
    paddingVertical: 10,
  },
  stationBubble: {
    backgroundColor: steward.black,
    borderTopRightRadius: spacing.small,
  },
  controlBubble: {
    backgroundColor: steward.chat.controlRoom,
    borderTopLeftRadius: spacing.small,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  stationText: {
    color: colors.textInverse,
  },
  controlText: {
    color: steward.chat.onControlRoom,
  },
  time: {
    color: steward.muted,
    fontSize: 12,
  },
});
