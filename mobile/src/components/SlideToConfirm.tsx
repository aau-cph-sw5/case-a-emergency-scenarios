import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import {
  colors,
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
// cannot be slid. disabled is the short pause while a change is being sent.
export function SlideToConfirm({
  label,
  tone,
  lockedReason = null,
  disabled: busy = false,
  onConfirm,
  onSlidingChange,
}: {
  label: string;
  tone: SlideTone;
  lockedReason?: string | null;
  disabled?: boolean;
  onConfirm: () => void;
  onSlidingChange?: (sliding: boolean) => void;
}) {
  const locked = lockedReason !== null;
  const disabled = busy || locked;
  const look = locked
    ? { track: steward.locked, text: steward.lockedText }
    : TONES[tone];
  const [trackWidth, setTrackWidth] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const maxOffset = Math.max(trackWidth - KNOB_SIZE - 2 * INSET, 0);

  // Rebuilt when the width, the disabled state or the action changes, so the
  // gesture always uses the current values.
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
          offset.setValue(maxOffset);
          onConfirm();
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
          onConfirm();
        }
      }}
      onLayout={(event: LayoutChangeEvent) =>
        setTrackWidth(event.nativeEvent.layout.width)
      }
      style={[
        styles.track,
        { backgroundColor: look.track },
        busy && !locked && styles.disabled,
      ]}
      testID="slide-to-confirm"
    >
      <View style={styles.labels}>
        <Text style={[styles.label, { color: look.text }]}>{label}</Text>
        {locked && (
          <Text style={[styles.reason, { color: look.text }]}>
            {lockedReason}
          </Text>
        )}
      </View>
      {/* Three chevrons point the way the knob goes. */}
      {!locked && (
        <Text
          style={[styles.chevrons, { color: look.text }]}
          importantForAccessibility="no"
        >
          ›››
        </Text>
      )}
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
        ) : (
          <Text style={[styles.arrow, { color: look.track }]}>→</Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: panelRadius,
    height: KNOB_SIZE + 2 * INSET,
    justifyContent: "center",
    marginTop: spacing.medium,
    padding: INSET,
  },
  disabled: {
    opacity: 0.4,
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
