import { useMemo, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { colors, panelRadius, spacing, text } from "../../../shared/Theme";

const KNOB_SIZE = 52;
// The gap between the knob and the edge of the track.
const INSET = spacing.small;
// How far the knob must travel before the action counts, so a brush with a
// thumb while walking does not confirm anything.
const CONFIRM_SHARE = 0.85;

// A slider the steward pushes to the right to confirm. Used where a single
// tap would be too easy to make by mistake, such as confirming arrival.
// Screen readers get the same action as a plain "activate".
//
// The slider keeps the gesture once it has started: a thumb that drifts up or
// down while sliding would otherwise hand it to the surrounding ScrollView, so
// the page scrolled and the knob sprang back. onSlidingChange tells the
// screen when a slide starts and ends, so it can stop scrolling meanwhile.
export function SlideToConfirm({
  label,
  color,
  disabled = false,
  onConfirm,
  onSlidingChange,
}: {
  label: string;
  color: string;
  disabled?: boolean;
  onConfirm: () => void;
  onSlidingChange?: (sliding: boolean) => void;
}) {
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

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
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
        { backgroundColor: color },
        disabled && styles.disabled,
      ]}
      testID="slide-to-confirm"
    >
      <Text style={styles.label}>{label}</Text>
      <Animated.View
        {...responder.panHandlers}
        style={[styles.knob, { transform: [{ translateX: offset }] }]}
      >
        <Text style={[styles.arrow, { color }]}>→</Text>
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
  label: {
    ...text.button,
    color: colors.textInverse,
    letterSpacing: 1,
    paddingLeft: KNOB_SIZE + spacing.large,
  },
  knob: {
    alignItems: "center",
    backgroundColor: colors.background,
    // Follows the track's corner, inset by the gap.
    borderRadius: panelRadius - INSET,
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
