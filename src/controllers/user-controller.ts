import type { Request, Response } from "express";
import { ERROR_CODES, errorBody } from "../../shared/error-codes.js";
import type { UserCreate } from "../../shared/types/v1/user-create.js";
import type { UserUpdate } from "../../shared/types/v1/user-update.js";
import type { AuthUser } from "../services/auth-service.js";
import { createUser, listUsers, updateUser } from "../services/user-service.js";

export async function getUsers(_request: Request, response: Response) {
  response.json(await listUsers());
}

export async function postUser(request: Request, response: Response) {
  const result = await createUser(request.body as UserCreate);
  if (result.kind === "username-taken") {
    response
      .status(409)
      .json(errorBody(ERROR_CODES.CONFLICT, "The username is already taken"));
    return;
  }
  response.status(201).json(result.user);
}

export async function editUser(
  request: Request<{ userId: string }>,
  response: Response,
) {
  const { userId } = request.params;
  const id = /^[1-9]\d*$/.test(userId) ? Number(userId) : Number.NaN;
  const result = Number.isNaN(id)
    ? { kind: "not-found" as const }
    : await updateUser(
        response.locals.user as AuthUser,
        id,
        request.body as UserUpdate,
      );

  if (result.kind === "not-found") {
    response
      .status(404)
      .json(
        errorBody(ERROR_CODES.NOT_FOUND, `No user with id '${userId}' exists`),
      );
    return;
  }
  if (result.kind === "own-role") {
    response
      .status(409)
      .json(
        errorBody(
          ERROR_CODES.CONFLICT,
          "An admin cannot change their own role",
        ),
      );
    return;
  }
  response.json(result.user);
}
