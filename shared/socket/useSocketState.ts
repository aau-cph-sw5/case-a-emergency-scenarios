import { useEffect, useRef, useState } from "react";
import type { AppSocket } from "./createSocket";
import type { ScenarioActivated } from "./events";
import type { PositionReport } from "../types/v1/position-report";

export function useSocketState(socket: AppSocket) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState<Array<{ id: number; text: string }>>(
    [],
  );

  // Latest activated scenario (steward) and latest position per steward (operator).
  const [activated, setActivated] = useState<ScenarioActivated | null>(null);
  const [positions, setPositions] = useState<Record<string, PositionReport>>(
    {},
  );
  const nextMessageId = useRef(0);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onWelcome(message: string) {
      setMessages((previous) => [
        ...previous,
        { id: nextMessageId.current++, text: message },
      ]);
    }

    // An operator activated a scenario.
    function onScenarioActivated(event: ScenarioActivated) {
    console.log("Scenario activated:", JSON.stringify(event.scenario, null, 2));
      setActivated(event);
    }

    // A steward reported a position.
    function onPositionReport(report: PositionReport) {
      console.log("Position reported:", report);
      setPositions((previous) => {
        const current = previous[report.staff];
        // Keep the newest report
        if (current && current.reportedAt > report.reportedAt) return previous;
        return { ...previous, [report.staff]: report };
      });
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("welcome", onWelcome);
    socket.on("scenario-activated", onScenarioActivated);
    socket.on("position-report", onPositionReport);  

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("welcome", onWelcome);
      socket.off("scenario-activated", onScenarioActivated);
      socket.off("position-report", onPositionReport); 
    };
  }, [socket]);

  return { isConnected, messages, activated, positions};
}
