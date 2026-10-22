import { useEffect, useState } from "react";
import type { AppSocket } from "./createSocket";
import type { ScenarioActivated } from "./events";

// The latest scenario an operator activated, for the steward view.
export function useActivatedScenario(socket: AppSocket) {
  const [activated, setActivated] = useState<ScenarioActivated | null>(null);

  useEffect(() => {
    function onScenarioActivated(event: ScenarioActivated) {
      console.log(
        "Scenario activated:",
        JSON.stringify(event.scenario, null, 2),
      );
      setActivated(event);
    }

    socket.on("scenario-activated", onScenarioActivated);
    return () => {
      socket.off("scenario-activated", onScenarioActivated);
    };
  }, [socket]);

  return activated;
}
