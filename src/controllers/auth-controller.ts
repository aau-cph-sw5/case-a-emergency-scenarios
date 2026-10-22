import type { Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import { login } from "../services/auth-service.js";

export function postLogin(request: Request, response: Response) {
  const { username, password } = request.body as {
    username: string;
    password: string;
  };

  const session = login(username, password);
  if (!session) {
    response
      .status(401)
      .json(errorBody(ERROR_CODES.INVALID_CREDENTIALS, "Invalid credentials"));
    return;
  }
  response.json(session);
}
export function getMe(_request: Request, response: Response) {
  response.json(response.locals.user);
}
