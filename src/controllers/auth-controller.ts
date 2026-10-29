import type { Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { Client } from "../../shared/auth/client-access.js";
import type { Server } from "socket.io";
import {
  disconnectInvalidUserSockets,
  sessionRoom,
} from "../realtime/socket-server.js";
import {
  login,
  logout,
  renew,
  type AuthUser,
} from "../services/auth-service.js";

type AuthenticatedResponse = Response<unknown, { user: AuthUser }>;

export async function postLogin(request: Request, response: Response) {
  const { username, password, client } = request.body as {
    username: string;
    password: string;
    client: Client;
  };

  const session = await login(username, password, client);

  if (!session) {
    response
      .status(401)
      .json(errorBody(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials"));
    return;
  }

  const { userId, ...body } = session;
  const io = request.app.locals.io as Server | undefined;
  if (io) await disconnectInvalidUserSockets(io, userId);
  response.json(body);
}

export async function postRenew(
  _request: Request,
  response: AuthenticatedResponse,
) {
  const session = await renew(response.locals.user);

  if (session.kind === "not-due") {
    response.status(204).end();
    return;
  }

  if (session.kind === "invalid") {
    response
      .status(401)
      .json(
        errorBody(ERROR_CODES.AUTH_TOKEN_INVALID, "Invalid or expired token"),
      );
    return;
  }

  response.json(session.session);
}

export function getMe(_request: Request, response: AuthenticatedResponse) {
  const { userId, role } = response.locals.user;

  response.json({ userId, role });
}

export async function postLogout(
  request: Request,
  response: AuthenticatedResponse,
) {
  await logout(response.locals.user);
  const io = request.app.locals.io as Server | undefined;
  if (io) io.in(sessionRoom(response.locals.user)).disconnectSockets();
  response.status(204).end();
}
