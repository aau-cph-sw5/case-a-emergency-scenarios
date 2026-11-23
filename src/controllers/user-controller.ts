import type { Request, Response } from "express";
import type { Server } from "socket.io";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { UserCreate } from "../../shared/types/v1/user-create.js";
import type { UserUpdate } from "../../shared/types/v1/user-update.js";
import { userRoom } from "../realtime/socket-server.js";
import type { AuthUser } from "../services/auth-service.js";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from "../services/user-service.js";

// The id from the path, or NaN when it is not a positive whole number.
function parseUserId(userId: string): number {
  return /^[1-9]\d*$/.test(userId) ? Number(userId) : Number.NaN;
}

function notFound(response: Response, userId: string) {
  response
    .status(404)
    .json(
      errorBody(ERROR_CODES.NOT_FOUND, `No user with id '${userId}' exists`),
    );
}

function conflict(response: Response, message: string) {
  response.status(409).json(errorBody(ERROR_CODES.CONFLICT, message));
}

// The user's sessions were ended, so their open sockets are closed too.
function disconnectUser(request: Request, userId: number) {
  const io = request.app.locals.io as Server | undefined;
  io?.in(userRoom(userId)).disconnectSockets(true);
}

export async function getUsers(_request: Request, response: Response) {
  response.json(await listUsers());
}

export async function postUser(request: Request, response: Response) {
  const result = await createUser(request.body as UserCreate);
  if (result.kind === "username-taken") {
    conflict(response, "The username is already taken");
    return;
  }
  response.status(201).json(result.user);
}

export async function editUser(
  request: Request<{ userId: string }>,
  response: Response,
) {
  const { userId } = request.params;
  const id = parseUserId(userId);
  const result = Number.isNaN(id)
    ? { kind: "not-found" as const }
    : await updateUser(
        response.locals.user as AuthUser,
        id,
        request.body as UserUpdate,
      );

  if (result.kind === "not-found") {
    notFound(response, userId);
    return;
  }
  if (result.kind === "own-role") {
    conflict(response, "An admin cannot change their own role");
    return;
  }
  if (result.kind === "own-account") {
    conflict(response, "An admin cannot disable their own account");
    return;
  }
  disconnectUser(request, id);
  response.json(result.user);
}

export async function removeUser(
  request: Request<{ userId: string }>,
  response: Response,
) {
  const { userId } = request.params;
  const id = parseUserId(userId);
  const result = Number.isNaN(id)
    ? { kind: "not-found" as const }
    : await deleteUser(response.locals.user as AuthUser, id);

  if (result.kind === "not-found") {
    notFound(response, userId);
    return;
  }
  if (result.kind === "own-account") {
    conflict(response, "An admin cannot delete their own account");
    return;
  }
  disconnectUser(request, id);
  response.status(204).end();
}
