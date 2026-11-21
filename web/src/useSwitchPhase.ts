import { useEffect, useState } from "react";

type Phase = "closed" | "open" | "closing";

// Switching previews another scenario without stopping the current one. The
// picker stays mounted until its exit animation has finished; the timeout also
// completes cancellation if animations are disabled outside our CSS.
export function useSwitchPhase(
  activeScenarioId: string | null,
  onSelect: (scenarioId: string | null) => void,
) {
  const [phase, setPhase] = useState<Phase>("closed");

  function finish() {
    setPhase("closed");
    onSelect(activeScenarioId);
  }

  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => {
      setPhase("closed");
      onSelect(activeScenarioId);
    }, 350);
    return () => clearTimeout(timer);
  }, [phase, activeScenarioId, onSelect]);

  // Annuller: leave switching (animated unless the user asks for less motion),
  // or clear the selection when not switching.
  function cancel() {
    if (phase === "closed") onSelect(null);
    else if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      finish();
    else setPhase("closing");
  }

  return {
    switching: phase !== "closed",
    closing: phase === "closing",
    open: () => setPhase("open"),
    reset: () => setPhase("closed"),
    finish,
    cancel,
  };
}
