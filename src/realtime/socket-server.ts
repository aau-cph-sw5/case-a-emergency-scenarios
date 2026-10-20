import type { Server, Socket } from "socket.io";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { verifyToken, type AuthUser } from "../services/auth-service.js";
import { findScenario, latestActivation } from "../repositories/fixture-repository.js";

// Each socket joins the room named after its role, so an event can be sent to
// one role only: io.to("OPERATOR") or io.to("STEWARD").
export type RoleRoom = AuthUser["role"];

// Refuses a socket connection without a valid token.
export function authenticateSocket(
  socket: Socket,
  next: (error?: Error) => void,
) {
  const token: unknown = socket.handshake.auth?.token;
  const user = typeof token === "string" ? verifyToken(token) : null;
  if (!user) {
    next(new Error(ERROR_CODES.AUTH_TOKEN_INVALID));
    return;
  }
  socket.data.user = user;
  next();
}

export function attachSocketHandlers(io: Server) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const { userId, role } = socket.data.user as AuthUser;
    socket.join(role satisfies RoleRoom);
    console.log("Socket connected:", socket.id, userId, role);
    socket.emit("welcome", "Connected to the emergency scenarios server.");

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
    });

    const latest = latestActivation();
    if (role === "STEWARD" && latest) {
      socket.emit("scenario-activated", {
        scenario: findScenario(latest.scenarioId),
        sentAt: new Date().toISOString(),
      });
    }
  });
}


