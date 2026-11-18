import { LayoutAnimation } from "react-native";
import { motion } from "../../shared/Theme";

// THE ONE way a block changes height or place in the steward app (#375,
// #376). Call it right before the state change that changes the layout; the
// next layout then animates instead of jumping: a block that changes height
// or place moves on an ease-in-out curve. It runs on the native side, so it
// stays smooth while JavaScript is busy.
//
// It moves sizes and places only. A block that appears or disappears does
// so at once: the fade it used to have could stop at invisible on a phone
// while the status card turned, and left white boxes until the next touch.
// Content that is replaced in place uses Swap instead.
export function animateNextLayout(): void {
  LayoutAnimation.configureNext({
    duration: motion.layoutMs,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
  });
}
