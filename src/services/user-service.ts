import bcrypt from "bcryptjs";
import type { UserCreate } from "../../shared/types/v1/user-create.js";
import type { UserUpdate } from "../../shared/types/v1/user-update.js";
import type { User } from "../../shared/types/v1/user.js";
import { getDatabase } from "../db/client.js";
import { authSessionRepository } from "../repositories/auth-session-repository.js";
import { userRepository } from "../repositories/user-repository.js";
import type { AuthUser } from "./auth-service.js";

const SALT_ROUNDS = 10;

export type CreateUserResult =
  { kind: "created"; user: User } | { kind: "username-taken" };

export type UpdateUserResult =
  | { kind: "updated"; user: User }
  | { kind: "not-found" }
  | { kind: "own-role" }
  | { kind: "own-account" };

export type DeleteUserResult =
  { kind: "deleted" } | { kind: "not-found" } | { kind: "own-account" };

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "23505";
}

export function listUsers(): Promise<User[]> {
  return userRepository.listUsers();
}

export async function createUser(input: UserCreate): Promise<CreateUserResult> {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  try {
    const user = await userRepository.createUser(
      input.username,
      passwordHash,
      input.role,
      input.lineGroup,
    );
    return { kind: "created", user };
  } catch (error) {
    if (isUniqueViolation(error)) return { kind: "username-taken" };
    throw error;
  }
}

// An admin may not change their own role or disable their own account, or the
// last admin could lock everyone out.
export async function updateUser(
  admin: AuthUser,
  userId: number,
  changes: UserUpdate,
): Promise<UpdateUserResult> {
  if (
    userId === admin.userId &&
    changes.role !== undefined &&
    changes.role !== admin.role
  ) {
    return { kind: "own-role" };
  }
  if (userId === admin.userId && changes.disabled === true) {
    return { kind: "own-account" };
  }
  const passwordHash =
    changes.password === undefined
      ? undefined
      : await bcrypt.hash(changes.password, SALT_ROUNDS);
  const user = await getDatabase().begin(async (tx) => {
    const updated = await userRepository.updateUser(
      userId,
      {
        passwordHash,
        role: changes.role,
        lineGroup: changes.lineGroup,
        disabled: changes.disabled,
      },
      tx,
    );
    if (updated) {
      await authSessionRepository.revokeAllSessionsForUser(userId, tx);
    }
    return updated;
  });
  if (!user) return { kind: "not-found" };
  return { kind: "updated", user };
}

// A soft delete, with the user's sessions ended in the same transaction. An
// admin may not delete their own account, like disabling it.
export async function deleteUser(
  admin: AuthUser,
  userId: number,
): Promise<DeleteUserResult> {
  if (userId === admin.userId) return { kind: "own-account" };
  const deleted = await getDatabase().begin(async (tx) => {
    const found = await userRepository.deleteUser(userId, tx);
    if (found) await authSessionRepository.revokeAllSessionsForUser(userId, tx);
    return found;
  });
  return deleted ? { kind: "deleted" } : { kind: "not-found" };
}
