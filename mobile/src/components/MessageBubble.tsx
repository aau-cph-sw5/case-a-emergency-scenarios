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

// How far a message the steward wrote has got, when the server has not
// stored it: still waiting on the phone ("Afventer"), or refused for good
// with the reason, so it is not sent again. No delivery means it was sent.
export type Delivery =
  { kind: "pending" } | { kind: "refused"; reason: string };

// One message in the station's chat (MET-A-029, #335). The station's messages
// are on the right: the steward's own black, a colleague's at the same
// station light grey. The control room's are Metro Deep Red on the left. Each
// has a word for who wrote it, so colour is not the only sign. A message that
// was not sent is outlined and carries a warning sign, so it is not mistaken
// for the control room. One still waiting on the phone (no connection) says
// "Afventer" with a clock, and goes out by itself when the phone is back
// online (MET-A-029, #336).
export function MessageBubble({
  fromStation,
  colleague = false,
  showSender,
  text: body,
  writtenAt,
  delivery,
}: {
  fromStation: boolean;
  // Written by another steward checked in at the same station.
  colleague?: boolean;
  // Only the first of several messages in a row from the same sender names
  // it; the screen reader name of each message always does.
  showSender: boolean;
  text: string;
  writtenAt: string;
  delivery?: Delivery;
}) {
  const time = clock(writtenAt);
  const refused = delivery?.kind === "refused" ? delivery.reason : null;
  const pending = delivery?.kind === "pending";
  const sender = fromStation
    ? colleague
      ? "Station, en kollega"
      : "Station, dig"
    : "Kontrolrum";
  return (
    <View
      style={[styles.row, fromStation ? styles.right : styles.left]}
      accessible
      accessibilityLabel={`${sender}, ${time}: ${body}${refused !== null ? `. ${refused}` : pending ? ". Afventer" : ""}`}
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
          colleague && styles.colleagueBubble,
          refused !== null && styles.failedBubble,
        ]}
      >
        <Text
          style={[
            styles.text,
            refused === null &&
              (colleague
                ? styles.colleagueText
                : fromStation
                  ? styles.stationText
                  : styles.controlText),
          ]}
        >
          {body}
        </Text>
      </View>
      {refused !== null && (
        <View style={styles.failedRow}>
          <WarningIcon />
          <Text style={styles.failedText}>{refused}</Text>
        </View>
      )}
      {pending && (
        <View style={styles.pendingRow} testID="message-pending">
          <ClockIcon />
          <Text style={styles.pendingText}>Afventer</Text>
        </View>
      )}
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

// Material Symbols' "schedule", next to a message still waiting on the phone.
export function ClockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 -960 960 960">
      <Path
        d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"
        fill={steward.muted}
      />
    </Svg>
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
  colleagueBubble: {
    backgroundColor: steward.chat.colleague,
  },
  controlBubble: {
    backgroundColor: steward.chat.controlRoom,
    borderTopLeftRadius: spacing.small,
  },
  failedBubble: {
    backgroundColor: colors.background,
    borderColor: steward.red,
    borderWidth: 2,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  stationText: {
    color: colors.textInverse,
  },
  colleagueText: {
    color: steward.chat.onColleague,
  },
  controlText: {
    color: steward.chat.onControlRoom,
  },
  failedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "flex-end",
  },
  failedText: {
    color: steward.nobody,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  pendingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  pendingText: {
    color: steward.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  time: {
    color: steward.muted,
    fontSize: 12,
  },
});
