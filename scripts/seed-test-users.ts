import bcrypt from "bcryptjs";
import postgres from "postgres";
import { fileURLToPath } from "node:url";

const SALT_ROUNDS = 10;

const users = [
  {
    username: "steward-test",
    password: "steward-test-pw",
    role: "STEWARD",
  },
  {
    username: "operator-test",
    password: "operator-test-pw",
    role: "OPERATOR",
  },
] as const;

export type SeededTestUser = {
  id: number;
  username: string;
  role: "STEWARD" | "OPERATOR";
};

// Connects as the owner, like seed-scenarios.ts: the application's role
// (metro_app) may only read users. The integration tests set OWNER_DATABASE_URL.
function connectAsOwner() {
  if (process.env.OWNER_DATABASE_URL) {
    return postgres(process.env.OWNER_DATABASE_URL);
  }
  if (!process.env.POSTGRES_PASSWORD) {
    throw new Error(
      "POSTGRES_PASSWORD is not set. Does .env exist, and is the script run with --env-file=.env?",
    );
  }
  return postgres({
    host: "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    username: "metro",
    password: process.env.POSTGRES_PASSWORD,
    database: "metro",
  });
}

export async function seedTestUsers(
  usernamePrefix = "",
): Promise<SeededTestUser[]> {
  const sql = connectAsOwner();
  const seededUsers: SeededTestUser[] = [];

  try {
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
  } finally {
    await sql.end();
  }

  return seededUsers;
}

async function main() {
  const seededUsers = await seedTestUsers();

  for (const user of seededUsers) {
    console.log(`Seeded ${user.username} with id ${user.id}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    console.error("Failed to seed test users:", error);
    process.exitCode = 1;
  });
}
