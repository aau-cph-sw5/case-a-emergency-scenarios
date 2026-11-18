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
import { CardButton } from "./CardButton";
import { DoubleArrow } from "./DoubleArrow";
import { DARK_DIM, LIGHT_DIM, ShineText } from "./ShineText";
import { Swap } from "./Swap";
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
// The gap between the knob and the edge of the track, and between the slide
// and the cross next to it.
const INSET = spacing.small;
const GAP = spacing.small * 2;
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

// The three looks of a slide (#375), each in the colour of the status it
// leads to: yellow to confirm a station, green to check in, red to check out
// or cancel. Text is dark on the yellow track and white on the others.
export type SlideTone = "yellow" | "green" | "red";
// dim is the text between sweeps of the shine (see ShineText): the text
// colour, faint. The band takes the text colour itself.
type Look = { track: string; text: string; dim: string };
const TONES: Record<SlideTone, Look> = {
  yellow: { track: steward.yellow, text: colors.text, dim: DARK_DIM },
  green: { track: steward.green, text: colors.textInverse, dim: LIGHT_DIM },
  red: { track: steward.red, text: colors.textInverse, dim: LIGHT_DIM },
};
// The grey look of a slide that cannot be used right now.
const LOCKED_LOOK: Look = {
  track: steward.locked,
  text: steward.lockedText,
  dim: steward.lockedText,
};
// Every slide ends the same way: the track and the label fade into white, and
// the white knob disappears into it, before the card turns.
const END_LOOK: Look = {
  track: colors.background,
  text: colors.text,
  dim: DARK_DIM,
};
// From this share of the way, the track starts to fade into white.
const FADE_FROM = 0.75;

// THE slide (#375, #376): the steward pushes the knob to the right to
// confirm, where a single tap would be too easy to make by mistake. Screen
// readers get the same action as a plain "activate". Every slide in the app
// is this component.
//
// A locked slide (lockedReason set, for example without a connection) is grey,
// shows a padlock instead of the arrow and the reason under the label, and
// cannot be slid. disabled blocks the slide without changing its look.
//
// A completed slide is HELD: the knob stays at the end and the slide takes no
// new gesture, so the steward sees at once that the slide counted. While the
// screen works on it (pending), a spinner shows in the knob if it takes long.
// The slide lets go when the work is done.
//
// Past FADE_FROM of the way, the track and the label fade into white, so every
// slide ends the same way: the knob has gone into the track and the card turns.
//
// A new action in the same place (a new label) keeps the frame: the content
// changes with the shared-axis change (Swap), the knob starts from the left,
// and the track's colour fades from the old to the new.
//
// cross puts the ✕ button next to the slide (CardButton), for the slides
// the steward can step away from.
export function SlideToConfirm({
  label,
  tone,
  lockedReason = null,
  disabled: busy = false,
  pending = false,
  actionKey = label,
  cross,
  onConfirm,
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
  cross?: { label: string; onPress: () => void };
  onConfirm: () => void;
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
  // A spinner shows only while the slide is held. The timer that turns it on
  // can fire just after the slide has let go (React cancels the timer a
  // moment after the screen changed), which left a spinner on a free knob
  // for good.
  if (spinner && !held) setSpinner(false);
  const disabled = busy || locked || held;
  const sawPendingRef = useRef(false);
  const spinnerAtRef = useRef(0);
  const look = locked ? LOCKED_LOOK : TONES[tone];
  // A locked slide cannot be slid, so it does not fade.
  const endLook = locked ? null : END_LOOK;
  const [trackWidth, setTrackWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const maxOffset = Math.max(trackWidth - KNOB_SIZE - 2 * INSET, 0);
  // 0 until FADE_FROM of the way, then 1 at the end.
  const fadeInput = [0, maxOffset * FADE_FROM, maxOffset];
  const fading = endLook !== null && maxOffset > 0;
  const endOpacity = fading
    ? offset.interpolate({ inputRange: fadeInput, outputRange: [0, 0, 1] })
    : 0;
  const fadeColour = (now: string, later: string) =>
    fading
      ? offset.interpolate({
          inputRange: fadeInput,
          outputRange: [now, now, later],
        })
      : now;
  const labelColor = fadeColour(look.text, endLook?.text ?? look.text);
  const dimColor = fadeColour(look.dim, endLook?.dim ?? look.dim);

  // The old track colour on top of the new one, fading away when the slide
  // takes a new colour, at the pace of the shared-axis change. The colours
  // are set while rendering; the fade starts once they are on screen. A slide
  // that was completed has the card turn after it, and the next slide is in
  // its own colour from the first moment, so it does not fade.
  const [track, setTrack] = useState({
    now: look.track,
    old: look.track,
    n: 0,
  });
  if (look.track !== track.now) {
    setTrack({
      now: look.track,
      old: held ? look.track : track.now,
      n: track.n + 1,
    });
  }
  const [oldTrackOpacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (track.n === 0) return;
    oldTrackOpacity.setValue(1);
    // Started on the next tick: the overlay has just been given its colour,
    // and a native animation started in the same moment would connect to
    // the view that was replaced.
    const timer = setTimeout(() => {
      Animated.timing(oldTrackOpacity, {
        toValue: 0,
        duration: motion.axisOutMs + motion.axisInMs,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 0);
    return () => clearTimeout(timer);
  }, [track.n, oldTrackOpacity]);

  // A held slide waits for the screen: a spinner after SPINNER_DELAY_MS, and
  // when the work is done it lets go (after the spinner's minimum time, and
  // after the half change in which the next action takes its place).
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
      ? Math.max(motion.axisOutMs + 20, spinnerLeft)
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

  // Rebuilt when the width, the disabled state or the action changes, so the
  // gesture always uses the current values. The slide keeps the gesture once
  // it has started, so a thumb that drifts up or down does not lose it.
  const responder = useMemo(() => {
    const back = () =>
      Animated.spring(offset, { toValue: 0, useNativeDriver: false }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_event, gesture) => {
        offset.setValue(Math.min(Math.max(gesture.dx, 0), maxOffset));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (maxOffset > 0 && gesture.dx >= maxOffset * CONFIRM_SHARE) {
          // Held at the end until the screen is done (see above).
          offset.setValue(maxOffset);
          setHeld(true);
          onConfirm();
          return;
        }
        back();
      },
      onPanResponderTerminate: back,
    });
  }, [disabled, maxOffset, offset, onConfirm]);

  const slide = (
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
      style={[styles.track, { backgroundColor: look.track }]}
      testID="slide-to-confirm"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { backgroundColor: track.old, opacity: oldTrackOpacity },
        ]}
      />
      {/* White, fading in at the end of the slide. */}
      {fading && endLook && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.fill,
            { backgroundColor: endLook.track, opacity: endOpacity },
          ]}
        />
      )}
      {/* A new label is a new action: the content changes by the shared
          axis, and the knob goes back to the start once it has. */}
      <Swap swapKey={label} onSwap={() => offset.setValue(0)}>
        <View style={styles.content}>
          <View style={styles.labels}>
            <ShineText
              style={styles.label}
              dim={dimColor}
              bright={labelColor}
              still={locked}
            >
              {label}
            </ShineText>
            {locked && (
              <Text style={[styles.reason, { color: look.text }]}>
                {lockedReason}
              </Text>
            )}
          </View>
          <Animated.View
            {...responder.panHandlers}
            style={[styles.knob, { transform: [{ translateX: offset }] }]}
          >
            {locked ? (
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
            ) : spinner && held ? (
              <ActivityIndicator color={look.track} testID="slide-spinner" />
            ) : (
              <DoubleArrow height={20} color={look.track} />
            )}
          </Animated.View>
        </View>
      </Swap>
    </View>
  );

  // The same shape with and without the cross. A slide that gets a cross (from
  // BEKRÆFT to CHECK IND) must stay the same slide: a different shape made
  // React build the track again, and the new label then counted as the first,
  // so the knob was not put back and stayed out of sight past the track's end.
  return (
    <View style={styles.row}>
      <View style={styles.grow}>{slide}</View>
      {cross !== undefined && (
        <CardButton
          kind="cross"
          accessibilityLabel={cross.label}
          onPress={cross.onPress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  grow: {
    flex: 1,
  },
  track: {
    borderRadius: panelRadius,
    height: KNOB_SIZE + 2 * INSET,
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
    height: KNOB_SIZE + 2 * INSET,
    justifyContent: "center",
    padding: INSET,
  },
  // The text is centred in the track. The same room on both sides, as wide
  // as the knob, so a long text never runs under the knob.
  labels: {
    alignItems: "center",
    paddingHorizontal: KNOB_SIZE + spacing.small,
  },
  label: {
    ...text.button,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  reason: {
    fontSize: 12,
    textAlign: "center",
  },
  knob: {
    alignItems: "center",
    backgroundColor: colors.background,
    // Follows the track's corner: the track's radius minus the gap around
    // the knob, so the two corners run parallel.
    borderRadius: panelRadius - INSET,
    height: KNOB_SIZE,
    justifyContent: "center",
    left: INSET,
    position: "absolute",
    width: KNOB_SIZE,
  },
});
