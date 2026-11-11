import type { Server, Socket } from "socket.io";
import { ERROR_CODES } from "../../shared/error-codes.js";
import { verifyToken, type AuthUser } from "../services/auth-service.js";
import {
  findActiveActivation,
  findActiveScenarioVersion,
} from "../repositories/activation-repository.js";

import { findScenario } from "../repositories/scenario-repository.js";

// Each socket joins the room for its role and line group, so an event reaches
// one role in one line group only, e.g. io.to(roleRoom("STEWARD", "M1_M2")).
export function roleRoom(
  role: AuthUser["role"],
  lineGroup: AuthUser["lineGroup"],
): string {
  return `${role}:${lineGroup}`;
}

export function userRoom(userId: number): string {
  return `user:${userId}`;
}

export function sessionRoom(user: Pick<AuthUser, "userId" | "jti">): string {
  return `session:${user.userId}:${user.jti}`;
}

export async function disconnectInvalidUserSockets(io: Server, userId: number) {
  let sockets;
  try {
    sockets = await io.in(userRoom(userId)).fetchSockets();
  } catch (error) {
    // If sockets cannot be inspected, disconnect the room rather than leave
    // a potentially replaced session receiving events.
    io.in(userRoom(userId)).disconnectSockets();
    throw error;
  }
  await Promise.all(
    sockets.map(async (socket) => {
      try {
        const token: unknown = socket.handshake.auth?.token;
        const user =
          typeof token === "string" ? await verifyToken(token) : null;
        const connectedUser = socket.data.user as AuthUser;
        if (!user || user.role !== connectedUser.role) socket.disconnect();
      } catch {
        // Fail closed if the session cannot be checked.
        socket.disconnect();
      }
    }),
  );
}

// Refuses a socket connection without a valid token.
export function authenticateSocket(
  socket: Socket,
  next: (error?: Error) => void,
) {
  void authenticate(socket, next).catch(() => {
    next(new Error(ERROR_CODES.SERVICE_UNAVAILABLE));
  });
}

async function authenticate(socket: Socket, next: (error?: Error) => void) {
  const token: unknown = socket.handshake.auth?.token;
  const user = typeof token === "string" ? await verifyToken(token) : null;
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
    const user = socket.data.user as AuthUser;
    const { userId, role } = user;
    socket.join(userRoom(userId));
    socket.join(sessionRoom(user));
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
    });

    // Recheck after joining the user room so a concurrent login cannot miss
    // a socket whose handshake was already in progress.
    void verifyToken(socket.handshake.auth.token)
      .then(async (current) => {
        if (!current || current.role !== role || !socket.connected) {
          socket.disconnect();
          return;
        }
        await socket.join(roleRoom(role, current.lineGroup));
        console.log(
          "Socket connected:",
          socket.id,
          userId,
          role,
          current.lineGroup,
        );
        socket.emit("welcome", "Connected to the emergency scenarios server.");
        // The active scenario in the user's own line group.
        const latest = await findActiveActivation(current.lineGroup);
        if (role === "STEWARD" && latest) {
          try {
            const versionId = await findActiveScenarioVersion(
              latest.activationId,
              latest.scenarioId,
            );
            const scenario =
              versionId === undefined
                ? undefined
                : await findScenario(latest.scenarioId, versionId);
            if (scenario && socket.connected) {
              socket.emit("scenario-activated", {
                scenario,
                sentAt: new Date().toISOString(),
                sequence: latest.sequence,
              });
            }
          } catch (error) {
            console.error("Could not send the latest activation:", error);
          }
        }
      })
      .catch(() => socket.disconnect());
  });
}
