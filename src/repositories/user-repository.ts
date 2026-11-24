import { getDatabase, type Db } from "../db/client.js";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import type { Role } from "../../shared/auth/roles.js";
import type { User } from "../../shared/types/v1/user.js";

export type UserAccount = {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
  lineGroup: string;
};

// Only an account that may sign in: not deleted and not disabled. Used for
// login and for checking a token, so such an account gets no session.
async function getUserByUsername(
  username: string,
): Promise<UserAccount | null> {
  const sql = getDatabase();
  const result = await sql<UserAccount[]>`
        SELECT id, username, password_hash AS "passwordHash", role, line_group AS "lineGroup"
        FROM users
        WHERE lower(username) = lower(${username})
          AND deleted_at IS NULL
          AND NOT is_disabled
    `;
  return result[0] || null;
}

// Every account that is not deleted, disabled ones included.
async function listUsers(): Promise<User[]> {
  const sql = getDatabase();
  return sql<User[]>`
    SELECT id AS "userId", username, role, line_group AS "lineGroup",
      is_disabled AS "disabled"
    FROM users
    WHERE deleted_at IS NULL
    ORDER BY username
  `;
}

async function createUser(
  username: string,
  passwordHash: string,
  role: Role,
  lineGroup: LineGroup,
): Promise<User> {
  const sql = getDatabase();
  const [user] = await sql<User[]>`
    INSERT INTO users (username, password_hash, role, line_group)
    VALUES (${username}, ${passwordHash}, ${role}, ${lineGroup})
    RETURNING id AS "userId", username, role, line_group AS "lineGroup",
      is_disabled AS "disabled"
  `;
  return user;
}

// A deleted account cannot be edited, so it is not found.
async function updateUser(
  id: number,
  changes: {
    passwordHash?: string;
    role?: Role;
    lineGroup?: LineGroup;
    disabled?: boolean;
  },
  db: Db = getDatabase(),
): Promise<User | null> {
  const [user] = await db<User[]>`
    UPDATE users SET
      password_hash = COALESCE(${changes.passwordHash ?? null}, password_hash),
      role = COALESCE(${changes.role ?? null}, role),
      line_group = COALESCE(${changes.lineGroup ?? null}, line_group),
      is_disabled = COALESCE(${changes.disabled ?? null}::boolean, is_disabled)
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id AS "userId", username, role, line_group AS "lineGroup",
      is_disabled AS "disabled"
  `;
  return user ?? null;
}

// A soft delete: the row stays, so activations and log events keep their
// user. Returns false when there is no such account or it is already deleted.
async function deleteUser(
  id: number,
  db: Db = getDatabase(),
): Promise<boolean> {
  const rows = await db`
    UPDATE users SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND deleted_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

// Only an account that may sign in, like getUserByUsername.
async function getUserById(id: number): Promise<UserAccount | null> {
  const sql = getDatabase();
  const result = await sql<UserAccount[]>`
        SELECT id, username, password_hash AS "passwordHash", role, line_group AS "lineGroup"
        FROM users
        WHERE id = ${id}
          AND deleted_at IS NULL
          AND NOT is_disabled
    `;
  return result[0] || null;
}

export const userRepository = {
  getUserByUsername,
  getUserById,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
