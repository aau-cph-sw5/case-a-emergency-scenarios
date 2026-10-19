import { useEffect, useRef, useState } from "react";
import type { AppSocket } from "./createSocket";
import type { ScenarioActivated } from "./events";

export function useSocketState(socket: AppSocket) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState<Array<{ id: number; text: string }>>(
    [],
  );

  const [activated, setActivated] = useState<ScenarioActivated | null>(null);
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

     function onScenarioActivated(event: ScenarioActivated) {
      console.log("Scenario activated:", JSON.stringify(event.scenario, null, 2));
        setActivated(event);

    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("welcome", onWelcome);
    socket.on("scenario-activated", onScenarioActivated); 

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("welcome", onWelcome);
      socket.off("scenario-activated", onScenarioActivated);
    };
  }, [socket]);

  return { isConnected, messages, activated };
}
