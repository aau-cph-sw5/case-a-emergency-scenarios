import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import { verifyToken } from "../services/auth-service.js";

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const [scheme, token] = (request.headers.authorization ?? "").split(" ");

  if (scheme !== "Bearer" || !token) {
    response
      .status(401)
      .json(errorBody(ERROR_CODES.AUTH_TOKEN_INVALID, "Missing bearer token"));
    return;
  }

  const user = await verifyToken(token);

  if (!user) {
    response
      .status(401)
      .json(
        errorBody(ERROR_CODES.AUTH_TOKEN_INVALID, "Invalid or expired token"),
      );
    return;
  }

  response.locals.user = user;
  next();
}
