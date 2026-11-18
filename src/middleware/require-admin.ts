import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";

export function requireAdmin(
  _request: Request,
  response: Response,
  next: NextFunction,
) {
  if (response.locals.user.role !== "ADMIN") {
    response.status(403).json(errorBody(ERROR_CODES.ROLE_NOT_PERMITTED));
    return;
  }
  next();
}
