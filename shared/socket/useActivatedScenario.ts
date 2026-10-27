import { useEffect, useState } from "react";
import type { AppSocket } from "./createSocket";
import type { ScenarioActivated } from "./events";

// Keeps the current activation unless the incoming one is newer.
export function applyScenarioActivated(
  current: ScenarioActivated | null,
  incoming: ScenarioActivated,
): ScenarioActivated | null {
  if (current && incoming.sequence <= current.sequence) return current;
  return incoming;
}

// The latest scenario an operator activated, for the steward view.
export function useActivatedScenario(
  socket: AppSocket,
  fetchCurrent?: () => Promise<ScenarioActivated | null>,
) {
  const [activated, setActivated] = useState<ScenarioActivated | null>(null);

  useEffect(() => {
    let cancelled = false;

    function apply(event: ScenarioActivated) {
      console.log(
        "Scenario activated:",
        event.scenario.scenarioId,
        event.sequence,
      );
      setActivated((current) => applyScenarioActivated(current, event));
    }

    function onConnect() {
      fetchCurrent?.().then(
        (event) => {
          if (!cancelled && event) apply(event);
        },
        (error: unknown) => console.warn("Could not fetch activation:", error),
      );
    }

    socket.on("scenario-activated", apply);
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();
    return () => {
      cancelled = true;
      socket.off("scenario-activated", apply);
      socket.off("connect", onConnect);
    };
  }, [socket, fetchCurrent]);

  return activated;
}
