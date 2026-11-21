import { useEffect, useState } from "react";
import { AppState } from "react-native";

// Only a state that says the app is not in front counts as backgrounded.
function isActive(state: unknown): boolean {
  return state !== "background" && state !== "inactive";
}

// Whether the app is in the foreground (MET-A-029, #445). An unknown initial
// state counts as active so delivery is not blocked before the first event.
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => isActive(AppState.currentState));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      setActive(isActive(next));
    });
    return () => subscription.remove();
  }, []);

  return active;
}
