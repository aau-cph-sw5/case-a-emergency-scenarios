import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  useWindowDimensions,
} from "react-native";
import { motion } from "../../../shared/Theme";

// How far (or how fast) a sideways swipe has to go to dismiss.
const DISMISS_DISTANCE = 80;
const DISMISS_SPEED = 0.5;

// One notification that slides in from above and leaves with a sideways
// swipe, left or right, as on Android: it follows the finger, and past the
// distance (or fast enough) it slides out and onDismiss is called. Let go
// early and it springs back. Screen readers get a "Luk" action instead of the
// swipe. onDismiss has to stay the same function while the item shows.
export function SwipeToDismiss({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  // How far the finger has pulled the item sideways.
  const [drag] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.axisInMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const dismiss = (direction: 1 | -1) =>
    Animated.timing(drag, {
      toValue: direction * width,
      duration: motion.axisOutMs * 2,
      useNativeDriver: true,
    }).start(() => onDismiss());
  const [pan] = useState(() =>
    PanResponder.create({
      // Only a mostly sideways drag takes the touch.
      onMoveShouldSetPanResponder: (_event, { dx, dy }) =>
        Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: (_event, { dx }) => drag.setValue(dx),
      onPanResponderRelease: (_event, { dx, vx }) => {
        if (Math.abs(dx) > DISMISS_DISTANCE || Math.abs(vx) > DISMISS_SPEED) {
          dismiss(dx < 0 ? -1 : 1);
        } else {
          Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  );

  return (
    <Animated.View
      {...pan.panHandlers}
      accessibilityActions={[{ name: "dismiss", label: "Luk" }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "dismiss") dismiss(1);
      }}
      style={{
        opacity: Animated.multiply(
          progress,
          drag.interpolate({
            inputRange: [-width, 0, width],
            outputRange: [0, 1, 0],
          }),
        ),
        transform: [
          { translateX: drag },
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-motion.axisDistance * 2, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
