import type { Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import { login, logout, type AuthUser } from "../services/auth-service.js";

type AuthenticatedResponse = Response<unknown, { user: AuthUser }>;

export async function postLogin(request: Request, response: Response) {
  const { username, password } = request.body as {
    username: string;
    password: string;
  };

  const session = await login(username, password);

  if (!session) {
    response
      .status(401)
      .json(errorBody(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials"));
    return;
  }

  response.json(session);
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
