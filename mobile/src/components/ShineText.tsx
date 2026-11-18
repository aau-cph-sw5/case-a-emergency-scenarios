import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from "react-native";
import { shineClock, startShineClock } from "../shineClock";

// A colour that can also be an animated one (the slide fades its text into
// the next colour).
type Colour = string | Animated.AnimatedInterpolation<string>;

// The sheen is a bright band that sweeps across a dim text, as in the
// prototype. A band is made of a few bright copies of the text, each shown
// through a window that moves across the text (overflow hidden), the widest
// window faintest, so together they build a soft band with a bright middle.
// Everything that moves is a transform, so it runs on the native side. No
// gradient or mask library is needed (a mask of the text with a gradient
// under it needs two extra packages).
const LAYERS = [
  { share: 1, opacity: 0.4 },
  { share: 0.7, opacity: 0.4 },
  { share: 0.45, opacity: 0.4 },
  { share: 0.22, opacity: 0.4 },
];
// The dim text colour between sweeps, on a light and on a dark surface.
export const DARK_DIM = "rgba(30, 30, 30, 0.24)";
export const LIGHT_DIM = "rgba(255, 255, 255, 0.34)";
// The widest window, as a share of the text's width.
const BAND = 0.5;

// One line of text with the sheen. dim is the text's colour between sweeps,
// bright the colour of the band. still shows the text plain in the bright
// colour (a locked slide), and so does the phone's "reduce motion" setting.
// The text is one line, so the copies line up with it letter by letter.
export function ShineText({
  children,
  style,
  dim,
  bright,
  still = false,
}: {
  children: string;
  style: TextStyle;
  dim: Colour;
  bright: Colour;
  still?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (current) setReduceMotion(on);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      current = false;
      subscription.remove();
    };
  }, []);
  const plain = still || reduceMotion;
  useEffect(() => (plain ? undefined : startShineClock()), [plain]);

  if (plain) {
    return (
      <Animated.Text style={[style, { color: bright }]} numberOfLines={1}>
        {children}
      </Animated.Text>
    );
  }

  // The centre of the band, from just outside the left edge to just outside
  // the right edge.
  const band = width * BAND;
  const centre = shineClock.interpolate({
    inputRange: [0, 1],
    outputRange: [-band / 2, width + band / 2],
  });
  return (
    <View
      style={styles.wrap}
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
    >
      <Animated.Text style={[style, { color: dim }]} numberOfLines={1}>
        {children}
      </Animated.Text>
      {width > 0 &&
        LAYERS.map((layer) => {
          const window = band * layer.share;
          return (
            // The window moves with the band's centre; the text inside moves
            // the other way, so it stays where the dim text is.
            <Animated.View
              key={layer.share}
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[
                styles.window,
                {
                  opacity: layer.opacity,
                  width: window,
                  transform: [
                    { translateX: Animated.subtract(centre, window / 2) },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.copy,
                  {
                    width,
                    transform: [
                      { translateX: Animated.subtract(window / 2, centre) },
                    ],
                  },
                ]}
              >
                <Animated.Text
                  style={[style, { color: bright }]}
                  numberOfLines={1}
                >
                  {children}
                </Animated.Text>
              </Animated.View>
            </Animated.View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  // As wide as the text, so it can be centred by whoever holds it.
  wrap: { alignSelf: "center" },
  window: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
  copy: { left: 0, position: "absolute", top: 0 },
});
