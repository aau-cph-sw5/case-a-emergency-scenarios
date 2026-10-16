import type { NextFunction, Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../error-codes.js";
import { validate } from "../validation/contract-validator.js";

// Validate schema body

export function validateBody(schemaId: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    const errors = validate(request.body, schemaId);
    if (errors.length > 0) {
      response.status(400).json({
        ...errorBody(
          ERROR_CODES.MISSING_PARAMETER,
          "Request body does not match contract schema",
        ),
        details: errors,
      });
      return;
    }
    next();
  };
}
