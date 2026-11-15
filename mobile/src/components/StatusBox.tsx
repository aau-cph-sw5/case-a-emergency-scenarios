import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, motion, panelRadius, steward } from "../../../shared/Theme";

// How many are at a station and on the way, in the same words in the status
// box and in the station list (#375, #376).
export function staffingWords(arrived: number, enRoute: number): string {
  const parts = [
    arrived > 0 ? `${arrived} på stationen` : null,
    enRoute > 0 ? `${enRoute} på vej` : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Ingen tildelt";
}

export type StatusChip = { label: string; background: string; color: string };

// A short message that shows on the back of the box. key changes for every
// new message, also when the text is the same as the last one.
export type StatusNote = {
  key: number;
  text: string;
  background: string;
  color: string;
};

// The black status box at the top of the steward app (#375): the station and
// the steward's status, with one line under the name. It is the same height in
// every state, so nothing below it moves when the status changes.
//
// A note turns the box over like a card and shows on its back. The box turns
// back by itself after motion.notificationMs, or at once when it is tapped.
// Screen readers hear the note when it arrives.
export function StatusBox({
  station,
  chip,
  subLine,
  note,
}: {
  station: string;
  chip: StatusChip;
  subLine: string | null;
  note: StatusNote | null;
}) {
  // 0 shows the front (the status), 1 the back (the note).
  const [turn] = useState(() => new Animated.Value(0));
  // Refs, not state: turning the box changes no text, so nothing re-renders.
  const showingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const turnTo = useCallback(
    (toBack: boolean) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      showingRef.current = toBack;
      Animated.timing(turn, {
        toValue: toBack ? 1 : 0,
        duration: motion.flipMs,
        easing: Easing.inOut(Easing.cubic),
        // Driven from JavaScript on purpose: with the native driver, a
        // re-render during the next status change (check in) put the box
        // back on its black front for a moment before the new note.
        useNativeDriver: false,
      }).start();
    },
    [turn],
  );

  // Every new note turns the box over and back again after a while. No note
  // (for example after cancelling) shows the status side.
  const noteKey = note?.key;
  useEffect(() => {
    if (noteKey === undefined) {
      turnTo(false);
      return;
    }
    // A note that replaces one still showing changes the text on the back
    // without turning the box (it never shows the black front in between).
    if (!showingRef.current) turnTo(true);
    else if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => turnTo(false), motion.notificationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [noteKey, turnTo]);

  const noteText = note?.text;
  useEffect(() => {
    if (noteText) AccessibilityInfo.announceForAccessibility(noteText);
  }, [noteKey, noteText]);

  const front = turn.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const back = turn.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <Pressable
      accessibilityHint="Tryk for at vise status, når en besked vises"
      onPress={() => showingRef.current && turnTo(false)}
      style={styles.box}
      testID="status-box"
    >
      <Animated.View
        style={[
          styles.face,
          styles.front,
          { transform: [{ perspective: 800 }, { rotateY: front }] },
        ]}
      >
        <View style={styles.labels}>
          <Text style={styles.label}>STATION</Text>
          <Text style={styles.label}>STATUS</Text>
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {station}
          </Text>
          <Text
            style={[
              styles.chip,
              { backgroundColor: chip.background, color: chip.color },
            ]}
          >
            {chip.label}
          </Text>
        </View>
        {subLine !== null && <Text style={styles.subLine}>{subLine}</Text>}
      </Animated.View>
      {note && (
        <Animated.View
          style={[
            styles.face,
            styles.back,
            { backgroundColor: note.background },
            { transform: [{ perspective: 800 }, { rotateY: back }] },
          ]}
        >
          <Text style={[styles.note, { color: note.color }]} numberOfLines={1}>
            {note.text}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    height: steward.statusBoxHeight,
    marginBottom: 8,
  },
  face: {
    backfaceVisibility: "hidden",
    borderRadius: panelRadius,
    height: steward.statusBoxHeight,
  },
  front: {
    backgroundColor: steward.black,
    gap: 6,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  back: {
    justifyContent: "center",
    left: 0,
    paddingHorizontal: 16,
    position: "absolute",
    right: 0,
    top: 0,
  },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  label: {
    color: steward.labelGrey,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  name: {
    color: colors.textInverse,
    flexShrink: 1,
    fontSize: 28,
    fontWeight: "700",
  },
  chip: {
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subLine: { color: steward.labelGrey, fontSize: 14 },
  note: { fontSize: 20, fontWeight: "700" },
});
