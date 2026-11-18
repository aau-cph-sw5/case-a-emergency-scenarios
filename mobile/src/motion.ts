import { LayoutAnimation } from "react-native";
import { motion } from "../../shared/Theme";

// The ONE way a block opens, closes or changes height in the steward app
// (#375). Call it right before the state change that changes the layout; the
// next layout then animates instead of jumping:
// - a block that changes height or place moves on an ease-in-out curve;
// - a block that appears fades in once the others are past half way, so its
//   text does not show before there is room for it;
// - a block that disappears fades out first.
// It runs on the native side, so it stays smooth while JavaScript is busy.
export function animateNextLayout(): void {
  LayoutAnimation.configureNext({
    duration: motion.layoutMs,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
      delay: motion.fadeInDelayMs,
      duration: motion.fadeInMs,
    },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
      duration: motion.fadeOutMs,
    },
  });
}
