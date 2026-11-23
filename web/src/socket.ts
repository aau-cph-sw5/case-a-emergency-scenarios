import { createSocket } from "../../shared/socket/createSocket";

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3000");

export const socket = createSocket(socketUrl);
