import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { getDatabase } from "../src/db/client.js";

const SALT_ROUNDS = 10;

const users = [
  {
    username: "steward",
    password: "steward123",
    role: "STEWARD",
  },
  {
    username: "operator",
    password: "operator123",
    role: "OPERATOR",
  },
] as const;

export type SeededTestUser = {
  id: number;
  username: string;
  role: "STEWARD" | "OPERATOR";
};

export async function seedTestUsers(
  usernamePrefix = "",
): Promise<SeededTestUser[]> {
  const sql = getDatabase();
  const seededUsers: SeededTestUser[] = [];

  for (const user of users) {
    const username = `${usernamePrefix}${user.username}`;
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

    const [seededUser] = await sql<{ id: number }[]>`
        INSERT INTO users (username, password_hash, role)
        VALUES (${username}, ${passwordHash}, ${user.role})
        ON CONFLICT (lower(username)) DO UPDATE
        SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role
        RETURNING id
      `;

    seededUsers.push({
      id: seededUser.id,
      username,
      role: user.role,
    });
  }

  return seededUsers;
}

async function main() {
  const sql = getDatabase();

  try {
    const seededUsers = await seedTestUsers();

    for (const user of seededUsers) {
      console.log(`Seeded ${user.username} with id ${user.id}`);
    }
  } finally {
    await sql.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    console.error("Failed to seed test users:", error);
    process.exitCode = 1;
  });
}
