import { getDatabase } from "../db/client.js";

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
};
