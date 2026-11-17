import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { motion } from "../../shared/Theme";

// How far the tab or the panel must be dragged, as a share of the screen's
// width, before letting go opens or closes the panel. A quick flick does too.
const DRAG_SHARE = 0.3;
const FLICK_SPEED = 0.5;

// A panel that slides in from the right over the whole screen (#335): opened
// by a tap on its tab or by dragging the tab to the left, closed by swiping
// it to the right, by closePanel or by Android's back button.
export function useSlideInPanel(onOpenChange?: (open: boolean) => void) {
  const { width } = useWindowDimensions();
  // 0 closed (off the screen to the right), 1 open.
  const [progress] = useState(() => new Animated.Value(0));
  const [open, setOpen] = useState(false);
  // Whether the panel is on the screen: while open, and while it is dragged
  // or slides in or out.
  const [shown, setShown] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!cancelled) setReduceMotion(reduced);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const slideTo = useCallback(
    (target: 0 | 1) => {
      setOpen(target === 1);
      onOpenChange?.(target === 1);
      setShown(true);
      Animated.timing(progress, {
        toValue: target,
        duration: reduceMotion ? 0 : motion.layoutMs,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && target === 0) setShown(false);
      });
    },
    [progress, reduceMotion, onOpenChange],
  );
  const openPanel = useCallback(() => slideTo(1), [slideTo]);
  const closePanel = useCallback(() => slideTo(0), [slideTo]);

  // Dragging the tab to the left pulls the panel in with the finger. Only a
  // drag that starts on the tab: the right edge of an Android phone is the
  // system's back gesture.
  // The tab's own press (a tap) stays with the Pressable inside: the drag
  // takes over only once the finger moves to the left. Made once per width,
  // so a render during the drag does not start the gesture over.
  const tabDrag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          gesture.dx < -6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => setShown(true),
        onPanResponderMove: (_event, gesture) =>
          progress.setValue(Math.min(1, Math.max(0, -gesture.dx / width))),
        onPanResponderRelease: (_event, gesture) =>
          slideTo(
            -gesture.dx > width * DRAG_SHARE || gesture.vx < -FLICK_SPEED
              ? 1
              : 0,
          ),
        onPanResponderTerminate: () => slideTo(0),
      }),
    [progress, width, slideTo],
  );
  // Swiping the open panel to the right closes it. Only a clearly sideways
  // move, so scrolling inside it still scrolls.
  const panelDrag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dx > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderMove: (_event, gesture) =>
          progress.setValue(Math.min(1, Math.max(0, 1 - gesture.dx / width))),
        onPanResponderRelease: (_event, gesture) =>
          slideTo(
            gesture.dx > width * DRAG_SHARE || gesture.vx > FLICK_SPEED ? 0 : 1,
          ),
        onPanResponderTerminate: () => slideTo(1),
      }),
    [progress, width, slideTo],
  );

  // Android's back button closes the panel, not the app.
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closePanel();
        return true;
      },
    );
    return () => subscription.remove();
  }, [open, closePanel]);

  const translateX = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }),
    [progress, width],
  );

  return {
    open,
    shown,
    openPanel,
    closePanel,
    tabDragHandlers: tabDrag.panHandlers,
    panelDragHandlers: panelDrag.panHandlers,
    translateX,
  };
}
