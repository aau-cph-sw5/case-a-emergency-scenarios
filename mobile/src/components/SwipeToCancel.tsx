import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, motion, steward } from "../../../shared/Theme";

// How far the row must be swiped before it stays open, as a share of its
// width, and how fast a short flick must be (points per millisecond).
const OPEN_SHARE = 0.35;
const FLICK_SPEED = 0.6;
// How far the row nudges left once after assignment, so the swipe is found.
const PEEK = 64;
const PEEK_DELAY_MS = 3000;
// The last nudge that was played. The row is built again when the list
// changes (the map is collapsed, the list is measured), and without this the
// nudge would play again every time.
let lastPeek: number | undefined;

// The steward's own row while on the way (#376). Swiping it left reveals two
// buttons ON the row: BEHOLD and BEKRÆFT ANNULLÉR. The swipe only reveals
// them; nothing is cancelled until BEKRÆFT ANNULLÉR is pressed, so a stray
// swipe cannot cancel (research: NN/g "Contextual swipe", Apple turns full
// swipe off for destructive actions). A tap on the row opens the same buttons,
// so cancelling never needs a swipe (WCAG 2.5.1). peekKey nudges the row left
// once, each time it changes.
//
// EVERY station row is this component, in every state (#376): a row that can
// be chosen (onSelect), the own row on the way (onCancel), or a row that only
// shows. The row therefore stays the same element when a chosen station
// becomes the own station or the steward checks in, and only its content
// changes; a row that changed component was built anew and flickered.
export function SwipeToCancel({
  station,
  children,
  onCancel,
  onSelect,
  selected = false,
  peekKey,
  disabled = false,
}: {
  station: string;
  children: ReactNode;
  // Makes the row swipe (or tap) to cancel.
  onCancel?: () => void;
  // Makes the row a choice, when it cannot be cancelled.
  onSelect?: () => void;
  selected?: boolean;
  peekKey?: number;
  disabled?: boolean;
}) {
  const cancelable = onCancel !== undefined;
  const [width, setWidth] = useState(0);
  const [x] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // A row that can no longer be cancelled closes.
  if (!cancelable && open) setOpen(false);
  useEffect(() => {
    if (!cancelable) x.setValue(0);
  }, [cancelable, x]);

  const slideTo = (toOpen: boolean) => {
    setOpen(toOpen);
    Animated.timing(x, {
      toValue: toOpen ? -width : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only a sideways move is a swipe; an up or down move scrolls.
        onMoveShouldSetPanResponder: (_event, g) =>
          cancelable &&
          !disabled &&
          !open &&
          Math.abs(g.dx) > 8 &&
          Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_event, g) => x.setValue(Math.min(0, g.dx)),
        onPanResponderRelease: (_event, g) => {
          const far = -g.dx > width * OPEN_SHARE;
          const flick = g.dx < -30 && -g.vx > FLICK_SPEED;
          setOpen(far || flick);
          Animated.timing(x, {
            toValue: far || flick ? -width : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => x.setValue(0),
      }),
    [cancelable, disabled, open, width, x],
  );

  useEffect(() => {
    if (!cancelable || peekKey === undefined || peekKey === lastPeek) return;
    lastPeek = peekKey;
    Animated.sequence([
      // A while after the assignment (#376), when the steward has seen the
      // new status, the row nudges to show that it can be swiped.
      Animated.delay(PEEK_DELAY_MS),
      Animated.timing(x, {
        toValue: -PEEK,
        duration: motion.flipMs,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(x, {
        toValue: 0,
        duration: motion.flipMs + 150,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cancelable, peekKey, x]);

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {cancelable && (
        <View
          style={styles.under}
          // Hidden from screen readers until the row is open (Android, iOS).
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
          accessibilityElementsHidden={!open}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => slideTo(false)}
            style={[styles.button, styles.keep]}
          >
            <Text style={styles.keepText}>BEHOLD</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            // The row closes first, then the cancel is sent: the row is shut
            // before it stops being the own row. Cancelling from the open
            // row left its content slid out of sight on the phone, so the
            // station seemed to vanish from the list.
            onPress={() => {
              slideTo(false);
              onCancel?.();
            }}
            style={[styles.button, styles.cancel]}
          >
            <Text style={styles.cancelText}>BEKRÆFT ANNULLÉR</Text>
          </Pressable>
        </View>
      )}
      <Animated.View
        {...responder.panHandlers}
        style={{ transform: [{ translateX: x }] }}
        pointerEvents={open ? "none" : "auto"}
      >
        <Pressable
          accessibilityRole={cancelable || onSelect ? "button" : undefined}
          accessibilityLabel={
            cancelable
              ? `Annullér ${station}`
              : onSelect
                ? `Vælg ${station}`
                : undefined
          }
          accessibilityState={onSelect ? { selected } : undefined}
          disabled={disabled || (!cancelable && !onSelect)}
          onPress={() => (cancelable ? slideTo(true) : onSelect?.())}
        >
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
  under: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: steward.strip,
    flexDirection: "row",
    gap: 6,
    padding: 6,
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
  },
  keep: {
    backgroundColor: colors.background,
    flex: 1,
  },
  cancel: {
    backgroundColor: steward.red,
    flex: 2,
  },
  keepText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  cancelText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});
