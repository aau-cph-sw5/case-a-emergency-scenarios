import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
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
  ready = true,
}: {
  station: string;
  chip: StatusChip;
  subLine: string | null;
  note: StatusNote | null;
  // False until the steward's own status has been read: the box then shows
  // a small spinner instead of a status that may be wrong ("Ingen station"
  // for a steward who is on the way), and the real status appears in place.
  ready?: boolean;
}) {
  // 0 shows the front (the status), 1 the back (the note); -0.5 and 0.5
  // are the card on its edge.
  const [turn] = useState(() => new Animated.Value(0));
  // Refs, not state: turning the box changes no text, so nothing re-renders.
  const showingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ONE RULE FOR EVERY CHANGE OF STATUS (#376): the front never changes in
  // view. A new status (a new station or a new chip) only appears on the
  // front while the front is out of sight: behind a note that turns the box
  // over (assign, check in, check out), or, when there is no note (cancel,
  // a change from the server), by turning the card over its edge and back.
  // Only the line under the name (the staffing) changes in place.
  const [shownFront, setShownFront] = useState({ station, chip, subLine });
  const statusKey = `${station}|${chip.label}`;
  const shownKey = `${shownFront.station}|${shownFront.chip.label}`;
  // The first real status (when ready turns true) appears in place, without a
  // turn: before it there was only the spinner.
  const [wasReady, setWasReady] = useState(ready);
  if (ready !== wasReady) {
    setWasReady(ready);
    setShownFront({ station, chip, subLine });
  } else if (
    (!ready && statusKey !== shownKey) ||
    (statusKey === shownKey &&
      (subLine !== shownFront.subLine ||
        chip.background !== shownFront.chip.background ||
        chip.color !== shownFront.chip.color))
  ) {
    setShownFront({ station, chip, subLine });
  }
  // The newest front, read when the old one is out of sight.
  const latestRef = useRef({ station, chip, subLine });
  useEffect(() => {
    latestRef.current = { station, chip, subLine };
  });

  const turnTo = useCallback(
    (toBack: boolean, done?: () => void) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      showingRef.current = toBack;
      Animated.timing(turn, {
        toValue: toBack ? 1 : 0,
        duration: motion.flipMs,
        easing: Easing.inOut(Easing.cubic),
        // On the native side: driven from JavaScript, every frame of the turn
        // was a React render (measured: 6 extra renders per turn in a test,
        // about 18 on a phone), which made the whole screen flicker together
        // with LayoutAnimation.
        useNativeDriver: true,
      }).start(done);
    },
    [turn],
  );

  // A new status without a note: the card turns away over its edge, takes
  // the new front there, and turns back to the user, in the same time and
  // with the same easing as a whole turn.
  const turnFront = useCallback(() => {
    Animated.timing(turn, {
      toValue: 0.5,
      duration: motion.flipMs / 2,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Stopped (the box went away): do nothing more.
      if (!finished) return;
      setShownFront(latestRef.current);
      turn.setValue(-0.5);
      Animated.timing(turn, {
        toValue: 0,
        duration: motion.flipMs / 2,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [turn]);

  const noteKey = note?.key;
  const prevRef = useRef({ noteKey, statusKey, ready });
  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { noteKey, statusKey, ready };
    // Before the status is read, and when it has just been read, the front
    // just follows (see ready).
    if (!ready || !prev.ready) return;
    const newNote = noteKey !== undefined && noteKey !== prev.noteKey;
    const noteGone = noteKey === undefined && prev.noteKey !== undefined;
    const newStatus = statusKey !== prev.statusKey;
    // Takes the new front while it cannot be seen (the box shows its back).
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const swapHidden = () => {
      swapTimer = setTimeout(() => setShownFront(latestRef.current), 0);
    };

    if (newNote) {
      // A note that replaces one still showing changes the text on the back
      // without turning the box; otherwise the box turns to the note, and the
      // front takes the new status once it is out of sight.
      if (showingRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        swapHidden();
      } else {
        turnTo(true, () => setShownFront(latestRef.current));
      }
      timerRef.current = setTimeout(() => turnTo(false), motion.notificationMs);
    } else if (newStatus) {
      if (showingRef.current) {
        // On the back already: a status that changed without a note of its
        // own (cancelling, or a change from another phone) makes the note
        // out of date, so the new front is put in and the box turns back.
        swapHidden();
        turnTo(false);
      } else {
        turnFront();
      }
    } else if (noteGone && showingRef.current) {
      turnTo(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (swapTimer) clearTimeout(swapTimer);
    };
  }, [noteKey, statusKey, ready, turnTo, turnFront]);

  const noteText = note?.text;
  useEffect(() => {
    if (noteText) AccessibilityInfo.announceForAccessibility(noteText);
  }, [noteKey, noteText]);

  const front = turn.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-180deg", "0deg", "180deg"],
  });
  const back = turn.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["0deg", "180deg", "360deg"],
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
        {!ready && (
          <ActivityIndicator
            color={steward.labelGrey}
            style={styles.loading}
            testID="status-loading"
          />
        )}
        <View style={[styles.nameRow, !ready && styles.hidden]}>
          <Text style={styles.name} numberOfLines={1}>
            {shownFront.station}
          </Text>
          <Text
            style={[
              styles.chip,
              {
                backgroundColor: shownFront.chip.background,
                color: shownFront.chip.color,
              },
            ]}
          >
            {shownFront.chip.label}
          </Text>
        </View>
        {ready && shownFront.subLine !== null && (
          <Text style={styles.subLine}>{shownFront.subLine}</Text>
        )}
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
  loading: {
    left: 16,
    position: "absolute",
    top: 48,
  },
  hidden: {
    opacity: 0,
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
