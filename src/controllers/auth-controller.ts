import type { Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { Role } from "../../shared/auth/roles.js";
import {
  login,
  logout,
  renew,
  type AuthUser,
} from "../services/auth-service.js";

type AuthenticatedResponse = Response<unknown, { user: AuthUser }>;

export async function postLogin(request: Request, response: Response) {
  const { username, password, expectedRole } = request.body as {
    username: string;
    password: string;
    expectedRole: Role;
  };

  const session = await login(username, password, expectedRole);

  if (!session) {
    response
      .status(401)
      .json(errorBody(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials"));
    return;
  }

  response.json(session);
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
  _request: Request,
  response: AuthenticatedResponse,
) {
  await logout(response.locals.user);
  response.status(204).end();
}
