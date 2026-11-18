import { Animated, Easing } from "react-native";
import { motion } from "../../shared/Theme";

// THE one clock every shine runs on (as in the prototype): a value that goes
// from 0 to 1 over the sweep and then rests, over and over. Every new text
// starts at the phase the clock is at, so a text that is swapped in does not
// start its sweep again and jump in brightness. The clock runs only while a
// shine is on the screen; it runs on the native side, so it does not load
// the JavaScript thread.
export const shineClock = new Animated.Value(0);

let users = 0;
let loop: Animated.CompositeAnimation | null = null;

// Called by a shine when it shows; the function it returns tells the clock
// that the shine is gone.
export function startShineClock(): () => void {
  users += 1;
  if (loop === null) {
    const sweepMs = motion.shineMs * motion.shineSweepShare;
    loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineClock, {
          toValue: 1,
          duration: sweepMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(motion.shineMs - sweepMs),
        Animated.timing(shineClock, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
  }
  return () => {
    users -= 1;
    if (users === 0 && loop !== null) {
      loop.stop();
      loop = null;
      shineClock.setValue(0);
    }
  };
}
