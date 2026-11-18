import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Easing } from "react-native";
import { motion } from "../../../shared/Theme";

// THE ONE WAY something on the steward screen is replaced by something else
// in the same place (#376). The new content never just appears over the old,
// and the two never show at once. Two motions:
//
// - "axis" (shared axis): the old fades out moving a little up; once it is
//   gone, the new fades in moving up into place from a little below. For a
//   part of the screen: the bottom control, the slide's next action, a line
//   of text.
// - "turn": the card is turned over like a playing card, around its middle,
//   and comes up with the new content. For the status card: a new status
//   turns it. Only the motion is a turn: there is one card, see Turn.
//
// swapKey names what is shown; a new key starts a change, new children with
// the same key just show. The empty key ("" while the status is read) has
// nothing to change from, so the first real content shows at once. onSwap is
// called each time new content has taken over (for example, the slide puts
// its knob back at the start).
//
// A change inside a card that is turning is part of the turn: it shows at
// once, so two motions never run on top of each other.
const TurningContext = createContext(false);

export function Swap({
  swapKey,
  motion: kind = "axis",
  onSwap,
  children,
}: {
  swapKey: string;
  motion?: "axis" | "turn";
  onSwap?: (shownKey: string) => void;
  children: ReactNode;
}) {
  const view =
    kind === "turn" ? (
      <Turn swapKey={swapKey} onSwap={onSwap}>
        {children}
      </Turn>
    ) : (
      <Axis swapKey={swapKey} onSwap={onSwap}>
        {children}
      </Axis>
    );
  return view;
}

type Props = {
  swapKey: string;
  onSwap?: (shownKey: string) => void;
  children: ReactNode;
};

// Calls onSwap with the key now shown each time the content shown changes
// its key (not at first).
function useOnSwap(
  shownKey: string,
  onSwap: ((shownKey: string) => void) | undefined,
) {
  const onSwapRef = useRef(onSwap);
  useEffect(() => {
    onSwapRef.current = onSwap;
  });
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    onSwapRef.current?.(shownKey);
  }, [shownKey]);
}

// The shared-axis change.
function Axis({ swapKey, onSwap, children }: Props) {
  const insideTurn = use(TurningContext);
  const [shown, setShown] = useState({ key: swapKey, node: children });
  if (
    (swapKey === shown.key && children !== shown.node) ||
    (shown.key === "" && swapKey !== "") ||
    (insideTurn && swapKey !== shown.key)
  ) {
    setShown({ key: swapKey, node: children });
  }
  // 0 is in place, -1 is gone upwards, 1 waits below.
  const [progress] = useState(() => new Animated.Value(0));
  // The newest content, read when the old has gone.
  const latestRef = useRef({ key: swapKey, node: children });
  const onSwapRef = useRef(onSwap);
  useEffect(() => {
    latestRef.current = { key: swapKey, node: children };
    onSwapRef.current = onSwap;
  });

  const shownKey = shown.key;
  useEffect(() => {
    if (swapKey === shownKey) return;
    Animated.timing(progress, {
      toValue: -1,
      duration: motion.axisOutMs,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Stopped (a newer change, or the view went away): do nothing more.
      if (!finished) return;
      setShown(latestRef.current);
      progress.setValue(1);
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.axisInMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [swapKey, shownKey, progress]);
  useOnSwap(shownKey, onSwap);
  useEffect(() => () => progress.stopAnimation(), [progress]);

  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, 1, 0],
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-motion.axisDistance, 0, motion.axisDistance],
            }),
          },
        ],
      }}
    >
      {shown.node}
    </Animated.View>
  );
}

// The card turned over (#376), as an animation over ONE card: the card that
// shows is the real one all the time, so nothing in it is made again (the
// map keeps its drawing, the slide its state). It turns away to its edge with
// the old content, takes the new content while it is edge-on and cannot be
// seen, and turns on, the same way round, until it faces the steward again.
// Speeding up into the edge and slowing down out of it, the two halves make
// one smooth half round: a playing card turned over.
function Turn({ swapKey, onSwap, children }: Props) {
  const [shown, setShown] = useState({ key: swapKey, node: children });
  // The second half of a turn: the new content is in, the card turns on.
  const [secondHalf, setSecondHalf] = useState(false);
  // How many times the card has reached its edge; each one starts a second
  // half (see below).
  const [edges, setEdges] = useState(0);
  if (
    (swapKey === shown.key && children !== shown.node) ||
    (shown.key === "" && swapKey !== "")
  ) {
    setShown({ key: swapKey, node: children });
  }
  const turning = swapKey !== shown.key || secondHalf;
  // 0 faces the steward; 0.5 and -0.5 are the card edge-on.
  const [angle] = useState(() => new Animated.Value(0));
  // The newest content, read when the card is edge-on.
  const latestRef = useRef({ key: swapKey, node: children });
  const onSwapRef = useRef(onSwap);
  useEffect(() => {
    latestRef.current = { key: swapKey, node: children };
    onSwapRef.current = onSwap;
  });

  const shownKey = shown.key;
  useEffect(() => {
    if (swapKey === shownKey) return;
    Animated.timing(angle, {
      toValue: 0.5,
      duration: motion.flipMs / 2,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Stopped (the card went away): do nothing more.
      if (!finished) return;
      setShown(latestRef.current);
      setSecondHalf(true);
      setEdges((count) => count + 1);
      // Told in the same update as the new content, so what follows the
      // card (the list under it) changes in the same frame.
      onSwapRef.current?.(latestRef.current.key);
    });
  }, [swapKey, shownKey, angle]);

  // The second half starts only once the new content is on the screen. The
  // turn runs on the native side and React draws the content after it, so a
  // turn started at the edge itself showed the old card growing back for as
  // long as the new one took to draw.
  useEffect(() => {
    if (edges === 0) return;
    angle.setValue(-0.5);
    Animated.timing(angle, {
      toValue: 0,
      duration: motion.flipMs / 2,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setSecondHalf(false);
    });
  }, [edges, angle]);
  useEffect(() => () => angle.stopAnimation(), [angle]);

  return (
    <TurningContext value={turning}>
      <Animated.View
        style={{
          // The turn is drawn flat: the card's width follows the cosine of
          // its angle, which is what a card turning about its upright middle
          // looks like from in front. A real 3D turn (rotateY) cut the card
          // in half on iOS: the half turning away from the steward went
          // behind the flat list next to it and could not be seen.
          transform: [{ scaleX: angle.interpolate(TURN_WIDTH) }],
        }}
      >
        {shown.node}
      </Animated.View>
    </TurningContext>
  );
}

// The card's width at each angle: cos(angle × 180°), sampled every 11.25°.
// 0 faces the steward (full width); -0.5 and 0.5 are edge-on (no width).
const TURN_STEPS = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
const TURN_WIDTH = {
  inputRange: TURN_STEPS.map((step) => step / 8),
  outputRange: TURN_STEPS.map((step) => Math.cos((step / 8) * Math.PI)),
};
