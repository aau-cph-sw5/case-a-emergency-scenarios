import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import {
  colors,
  motion,
  panelRadius,
  spacing,
  steward,
  text,
} from "../../../shared/Theme";

// The track is steward.slideHeight high (#375): the knob plus the gap above and below it.
const KNOB_SIZE = steward.slideHeight - 2 * spacing.small;
// The gap between the knob and the edge of the track.
const INSET = spacing.small;
// How far the knob must travel before the action counts, so a brush with a
// thumb while walking does not confirm anything.
const CONFIRM_SHARE = 0.85;
// The spinner in the knob shows only when the answer takes longer than this,
// and then stays at least this long, so a quick answer shows no spinner and
// a slow one never flashes (#376; loading-indicator guidance: a short delay
// before showing, and a minimum time once shown).
const SPINNER_DELAY_MS = 300;
const SPINNER_MIN_MS = 300;
// When the screen never reports that it is working (pending), the slide lets
// go after this, so it can never stay stuck.
const NO_ANSWER_MS = 600;
// SHARED AXIS (#376): when the slide gets a new action (a new label), its
// frame stays and only the content changes, with the same shared-axis change
// as AxisSwap (motion.axis*): the old label, chevrons and knob go up and fade,
// the new ones come up from below, and the track's colour fades from the old
// to the new. The old is gone before the new arrives.
const AXIS_DISTANCE = motion.axisDistance;
const AXIS_OUT_MS = motion.axisOutMs;
const AXIS_IN_MS = motion.axisInMs;

// The three looks of a slide (#375), each in the colour of the status it
// leads to: yellow to confirm a station, green to check in, red to check out.
// Text is dark on the light yellow track and white on the others.
export type SlideTone = "yellow" | "green" | "red";
const TONES: Record<SlideTone, { track: string; text: string }> = {
  yellow: { track: steward.yellow, text: colors.text },
  green: { track: steward.green, text: colors.textInverse },
  red: { track: steward.red, text: colors.textInverse },
};

// A slider the steward pushes to the right to confirm. Used where a single
// tap would be too easy to make by mistake, such as confirming arrival.
// Screen readers get the same action as a plain "activate".
//
// The slider keeps the gesture once it has started: a thumb that drifts up or
// down while sliding would otherwise hand it to the surrounding ScrollView, so
// the page scrolled and the knob sprang back. onSlidingChange tells the
// screen when a slide starts and ends, so it can stop scrolling meanwhile.
//
// A locked slide (lockedReason set, for example without a connection) is grey,
// shows a padlock instead of the arrow and the reason under the label, and
// cannot be slid. disabled blocks the slide without changing its look.
//
// A completed slide is HELD (#376): the knob stays at the end and the slide
// takes no new gesture, so the steward sees at once that the slide counted.
// While the screen works on it (pending), a spinner shows in the knob if it
// takes long. The slide lets go when the work is done; when the next action
// takes its place (a new label) it starts from the left at once.
export function SlideToConfirm({
  label,
  tone,
  lockedReason = null,
  disabled: busy = false,
  pending = false,
  actionKey = label,
  onConfirm,
  onSlidingChange,
}: {
  label: string;
  tone: SlideTone;
  lockedReason?: string | null;
  disabled?: boolean;
  // The screen is working on the completed slide (for example sending it).
  pending?: boolean;
  // Which action the slide does now. When it changes, the hold ends at once
  // (the next action can be slid), also before the new label is shown.
  actionKey?: string;
  onConfirm: () => void;
  onSlidingChange?: (sliding: boolean) => void;
}) {
  const locked = lockedReason !== null;
  const [held, setHeld] = useState(false);
  const [spinner, setSpinner] = useState(false);
  // A new action in the same place starts from scratch.
  const [heldAction, setHeldAction] = useState(actionKey);
  if (actionKey !== heldAction) {
    setHeldAction(actionKey);
    if (held) setHeld(false);
    if (spinner) setSpinner(false);
  }
  const disabled = busy || locked || held;
  const sawPendingRef = useRef(false);
  const spinnerAtRef = useRef(0);
  const look = locked
    ? { track: steward.locked, text: steward.lockedText }
    : TONES[tone];
  // What the slide shows. It follows the props at once, except for a new
  // label, which arrives through the shared-axis change below.
  const [shown, setShown] = useState({ label, look, lockedReason });
  if (
    label === shown.label &&
    (look.track !== shown.look.track ||
      look.text !== shown.look.text ||
      lockedReason !== shown.lockedReason)
  ) {
    setShown({ label, look, lockedReason });
  }
  const [contentY] = useState(() => new Animated.Value(0));
  const [contentOpacity] = useState(() => new Animated.Value(1));
  const [oldTrack, setOldTrack] = useState(look.track);
  const [oldTrackOpacity] = useState(() => new Animated.Value(0));
  // The newest props, read when the old content has gone.
  const latestRef = useRef({ label, look, lockedReason });
  useEffect(() => {
    latestRef.current = { label, look, lockedReason };
  });
  const [trackWidth, setTrackWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const maxOffset = Math.max(trackWidth - KNOB_SIZE - 2 * INSET, 0);

  // The shared-axis change to a new label (see AXIS_DISTANCE).
  const shownLabel = shown.label;
  const shownTrack = shown.look.track;
  useEffect(() => {
    if (label === shownLabel) return;
    Animated.parallel([
      Animated.timing(contentY, {
        toValue: -AXIS_DISTANCE,
        duration: AXIS_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: AXIS_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // Stopped (the slide went away): do nothing more.
      if (!finished) return;
      // The old content is gone: the new one starts below, the knob at the
      // start, and the old track colour on top, fading away.
      setOldTrack(shownTrack);
      oldTrackOpacity.setValue(1);
      setShown(latestRef.current);
      offset.setValue(0);
      contentY.setValue(AXIS_DISTANCE);
      Animated.parallel([
        Animated.timing(contentY, {
          toValue: 0,
          duration: AXIS_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: AXIS_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(oldTrackOpacity, {
          toValue: 0,
          duration: AXIS_IN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [
    label,
    shownLabel,
    shownTrack,
    contentY,
    contentOpacity,
    oldTrackOpacity,
    offset,
  ]);

  // Rebuilt when the width, the disabled state or the action changes, so the
  // gesture always uses the current values.
  // A held slide waits for the screen: a spinner after SPINNER_DELAY_MS, and
  // when the work is done it lets go (after the spinner's minimum time, and
  // after the half turn in which the next action takes its place).
  useEffect(() => {
    if (!held) return;
    if (pending) {
      sawPendingRef.current = true;
      const timer = setTimeout(() => {
        spinnerAtRef.current = Date.now();
        setSpinner(true);
      }, SPINNER_DELAY_MS);
      return () => clearTimeout(timer);
    }
    const spinnerLeft = spinnerAtRef.current
      ? SPINNER_MIN_MS - (Date.now() - spinnerAtRef.current)
      : 0;
    const wait = sawPendingRef.current
      ? Math.max(AXIS_OUT_MS + 20, spinnerLeft)
      : NO_ANSWER_MS;
    const timer = setTimeout(() => {
      sawPendingRef.current = false;
      spinnerAtRef.current = 0;
      setSpinner(false);
      setHeld(false);
      Animated.spring(offset, { toValue: 0, useNativeDriver: false }).start();
    }, wait);
    return () => clearTimeout(timer);
  }, [held, pending, offset]);

  const responder = useMemo(() => {
    const reset = () => {
      onSlidingChange?.(false);
      Animated.spring(offset, { toValue: 0, useNativeDriver: false }).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => onSlidingChange?.(true),
      // A ScrollView asks for the gesture when the thumb moves vertically.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_event, gesture) => {
        offset.setValue(Math.min(Math.max(gesture.dx, 0), maxOffset));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (maxOffset > 0 && gesture.dx >= maxOffset * CONFIRM_SHARE) {
          // Held at the end until the screen is done (see above).
          offset.setValue(maxOffset);
          onSlidingChange?.(false);
          setHeld(true);
          onConfirm();
          return;
        }
        reset();
      },
      onPanResponderTerminate: reset,
    });
  }, [disabled, maxOffset, offset, onConfirm, onSlidingChange]);

  // A slider that goes away mid-swipe, e.g. when the scenario is stood down,
  // gets no release, so it lets the screen scroll again here (#310).
  useEffect(() => () => onSlidingChange?.(false), [onSlidingChange]);

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}. ${lockedReason}` : label}
      accessibilityHint="Skub til højre for at bekræfte"
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate" && !disabled) {
          setHeld(true);
          onConfirm();
        }
      }}
      onLayout={(event: LayoutChangeEvent) =>
        setTrackWidth(event.nativeEvent.layout.width)
      }
      style={[styles.track, { backgroundColor: shown.look.track }]}
      testID="slide-to-confirm"
    >
      {/* The old track colour, fading away after a new action arrived. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { backgroundColor: oldTrack, opacity: oldTrackOpacity },
        ]}
      />
      <Animated.View
        style={[
          styles.fill,
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentY }] },
        ]}
      >
        <View style={styles.labels}>
          <Text style={[styles.label, { color: shown.look.text }]}>
            {shown.label}
          </Text>
          {shown.lockedReason !== null && (
            <Text style={[styles.reason, { color: shown.look.text }]}>
              {shown.lockedReason}
            </Text>
          )}
        </View>
        {/* Three chevrons point the way the knob goes. */}
        {shown.lockedReason === null && (
          <Text
            style={[styles.chevrons, { color: shown.look.text }]}
            importantForAccessibility="no"
          >
            ›››
          </Text>
        )}
        <Animated.View
          {...responder.panHandlers}
          style={[styles.knob, { transform: [{ translateX: offset }] }]}
        >
          {shown.lockedReason !== null ? (
            <Svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke={steward.black}
              strokeWidth={2.2}
              testID="slide-lock"
            >
              <Rect x={5} y={11} width={14} height={9} rx={2} />
              <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </Svg>
          ) : spinner ? (
            <ActivityIndicator
              color={shown.look.track}
              testID="slide-spinner"
            />
          ) : (
            <Text style={[styles.arrow, { color: shown.look.track }]}>→</Text>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: panelRadius,
    height: KNOB_SIZE + 2 * INSET,
    marginTop: spacing.medium,
    // The content moves inside the track and is cut off at its edge.
    overflow: "hidden",
  },
  fill: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  content: {
    justifyContent: "center",
    padding: INSET,
  },
  labels: {
    paddingLeft: KNOB_SIZE + spacing.large,
  },
  label: {
    ...text.button,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  reason: {
    fontSize: 12,
  },
  chevrons: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 2,
    opacity: 0.6,
    position: "absolute",
    right: spacing.large,
  },
  knob: {
    alignItems: "center",
    backgroundColor: colors.background,
    // Follows the track's corner, inset by the gap.
    borderRadius: panelRadius - INSET * 1.5,
    height: KNOB_SIZE,
    justifyContent: "center",
    left: INSET,
    position: "absolute",
    width: KNOB_SIZE,
  },
  arrow: {
    fontSize: 26,
    fontWeight: "700",
  },
});
