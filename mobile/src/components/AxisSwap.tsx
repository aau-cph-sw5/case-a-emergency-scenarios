import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "../../../shared/Theme";

// THE way one thing is replaced by another in the same place (#376), for
// example the CHECK IND slide by the TJEK UD button: a shared-axis change.
// The old content fades out while moving a little up; then the new content
// fades in while moving up into place from a little below. The old is gone
// before the new arrives, so the two never show at once, and the place keeps
// its size, so nothing around it moves. swapKey names what is shown; a new
// key starts the change, new children with the same key just show.
export function AxisSwap({
  swapKey,
  children,
}: {
  swapKey: string;
  children: ReactNode;
}) {
  const [shown, setShown] = useState({ key: swapKey, node: children });
  // New children with the same key just show; so does the first real
  // content after an empty key (nothing shown yet, for example while the
  // steward's status is read), which has nothing to change from.
  if (
    (swapKey === shown.key && children !== shown.node) ||
    (shown.key === "" && swapKey !== "")
  ) {
    setShown({ key: swapKey, node: children });
  }
  const [y] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  // The newest content, read when the old one has gone.
  const latestRef = useRef({ key: swapKey, node: children });
  useEffect(() => {
    latestRef.current = { key: swapKey, node: children };
  });

  const shownKey = shown.key;
  useEffect(() => {
    if (swapKey === shownKey) return;
    const out = (to: number, value: Animated.Value) =>
      Animated.timing(value, {
        toValue: to,
        duration: motion.axisOutMs,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      });
    Animated.parallel([out(-motion.axisDistance, y), out(0, opacity)]).start(
      ({ finished }) => {
        // Stopped (a newer change, or the view went away): do nothing more.
        if (!finished) return;
        setShown(latestRef.current);
        y.setValue(motion.axisDistance);
        const into = (to: number, value: Animated.Value) =>
          Animated.timing(value, {
            toValue: to,
            duration: motion.axisInMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          });
        Animated.parallel([into(0, y), into(1, opacity)]).start();
      },
    );
  }, [swapKey, shownKey, y, opacity]);

  // A view that goes away mid-change stops its animations, so no value is
  // set on it afterwards.
  useEffect(
    () => () => {
      y.stopAnimation();
      opacity.stopAnimation();
    },
    [y, opacity],
  );

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: y }] }}>
      {shown.node}
    </Animated.View>
  );
}
