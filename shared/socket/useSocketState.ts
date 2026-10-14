import { useEffect, useRef, useState } from "react";
import type { AppSocket } from "./createSocket";

export function useSocketState(socket: AppSocket) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState<Array<{ id: number; text: string }>>([]);
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

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("welcome", onWelcome);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("welcome", onWelcome);
    };
  }, [socket]);

  return { isConnected, messages };
}
