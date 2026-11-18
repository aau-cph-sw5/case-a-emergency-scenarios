import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { Role } from "../../shared/auth/roles.js";

export function requireRole(role: Role) {
  return (_request: Request, response: Response, next: NextFunction) => {
    if (response.locals.user?.role !== role) {
      response.status(403).json(errorBody(ERROR_CODES.ROLE_NOT_PERMITTED));
      return;
    }
    next();
  };
}
