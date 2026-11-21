import { use, useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

// How much space to leave under a screen so the keyboard does not cover its
// bottom (#335). The app draws edge to edge (Expo SDK 58), so on Android the
// window does not shrink for the keyboard, and KeyboardAvoidingView measured
// it short there.
export function useKeyboardPadding(): number {
  const bottomInset = use(SafeAreaInsetsContext)?.bottom ?? 0;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === "ios";
    const shown = Keyboard.addListener(
      ios ? "keyboardWillShow" : "keyboardDidShow",
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hidden = Keyboard.addListener(
      ios ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  // On iOS the keyboard's height includes the home indicator's strip, which
  // the app already keeps clear of; on Android it stops above the system's
  // navigation bar, which the app keeps clear of too.
  return Math.max(
    0,
    Platform.OS === "ios" ? keyboardHeight - bottomInset : keyboardHeight,
  );
}
