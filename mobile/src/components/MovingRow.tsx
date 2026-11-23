import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "../../../shared/Theme";

// A row in a column that changes place when the order changes: it slides from
// where it was to where it is now, instead of jumping. top is the row's
// distance from the top of the column; the column works it out from the row
// heights, so the move starts before the screen is drawn and nothing flashes
// at the new place first. The other rows move the same way, so a row that goes
// up sends the rows it passes down. Only a change of order moves a row slowly:
// a row that is pushed down because the row above it grew (a chosen station)
// is not given a slide.
export function MovingRow({
  top,
  place,
  children,
}: {
  top: number;
  // The row's number in the order (0 is the first row).
  place: number;
  children: ReactNode;
}) {
  const [offset] = useState(() => new Animated.Value(0));
  const lastTopRef = useRef(top);
  const lastPlaceRef = useRef(place);
  useLayoutEffect(() => {
    const from = lastTopRef.current - top;
    const moved = lastPlaceRef.current !== place;
    lastTopRef.current = top;
    lastPlaceRef.current = place;
    if (from === 0 || !moved) return;
    offset.setValue(from);
    Animated.timing(offset, {
      toValue: 0,
      duration: motion.rowMoveMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [top, place, offset]);
  return (
    <Animated.View style={{ transform: [{ translateY: offset }] }}>
      {children}
    </Animated.View>
  );
}
