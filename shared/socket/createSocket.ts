import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./events";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(serverUrl: string): AppSocket {
  return io(serverUrl, { autoConnect: false });
}
