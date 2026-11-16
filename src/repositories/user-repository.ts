import { getDatabase } from "../db/client.js";
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

async function getUserByUsername(
  username: string,
): Promise<UserAccount | null> {
  const sql = getDatabase();
  const result = await sql<UserAccount[]>`
        SELECT id, username, password_hash AS "passwordHash", role, line_group AS "lineGroup"
        FROM users
        WHERE lower(username) = lower(${username})
    `;
  return result[0] || null;
}

async function listUsers(): Promise<User[]> {
  const sql = getDatabase();
  return sql<User[]>`
    SELECT id AS "userId", username, role, line_group AS "lineGroup"
    FROM users
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
    RETURNING id AS "userId", username, role, line_group AS "lineGroup"
  `;
  return user;
}

async function updateUser(
  id: number,
  changes: { passwordHash?: string; role?: Role; lineGroup?: LineGroup },
): Promise<User | null> {
  const sql = getDatabase();
  const [user] = await sql<User[]>`
    UPDATE users SET
      password_hash = COALESCE(${changes.passwordHash ?? null}, password_hash),
      role = COALESCE(${changes.role ?? null}, role),
      line_group = COALESCE(${changes.lineGroup ?? null}, line_group)
    WHERE id = ${id}
    RETURNING id AS "userId", username, role, line_group AS "lineGroup"
  `;
  return user ?? null;
}

async function getUserById(id: number): Promise<UserAccount | null> {
  const sql = getDatabase();
  const result = await sql<UserAccount[]>`
        SELECT id, username, password_hash AS "passwordHash", role, line_group AS "lineGroup"
        FROM users
        WHERE id = ${id}
    `;
  return result[0] || null;
}

export const userRepository = {
  getUserByUsername,
  getUserById,
  listUsers,
  createUser,
  updateUser,
};
