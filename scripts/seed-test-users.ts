import bcrypt from "bcryptjs";
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import type { LineGroup } from "../shared/auth/line-groups.js";
import type { Role } from "../shared/auth/roles.js";

const DEFAULT_SALT_ROUNDS = 10;
const MIN_SALT_ROUNDS = 4;
const MAX_SALT_ROUNDS = 10;

export function resolveSaltRounds(
  raw: string | undefined = process.env.TEST_BCRYPT_ROUNDS,
): number {
  const trimmed = raw?.trim();
  if (!trimmed) return DEFAULT_SALT_ROUNDS;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `TEST_BCRYPT_ROUNDS must be an integer between ${MIN_SALT_ROUNDS} and ${MAX_SALT_ROUNDS}.`,
    );
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < MIN_SALT_ROUNDS || parsed > MAX_SALT_ROUNDS) {
    throw new Error(
      `TEST_BCRYPT_ROUNDS must be between ${MIN_SALT_ROUNDS} and ${MAX_SALT_ROUNDS}.`,
    );
  }
  return parsed;
}

const m1m2Users = [
  {
    username: "steward",
    password: "steward123",
    role: "STEWARD",
    lineGroup: "M1_M2",
  },
  {
    username: "operator",
    password: "operator123",
    role: "OPERATOR",
    lineGroup: "M1_M2",
  },
] as const;

const adminAccount = {
  username: "admin",
  password: "admin123",
  role: "ADMIN",
  lineGroup: "M1_M2",
} as const;

const users = [
  ...m1m2Users,
  ...m1m2Users.map((user) => ({
    ...user,
    username: `${user.username}-m3m4`,
    lineGroup: "M3_M4" as const,
  })),
  adminAccount,
];

export type SeededTestUser = {
  id: number;
  username: string;
  role: Role;
  lineGroup: LineGroup;
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
  const saltRounds = resolveSaltRounds();
  const sql = connectAsOwner();
  const seededUsers: SeededTestUser[] = [];

  try {
    for (const user of users) {
      const username = `${usernamePrefix}${user.username}`;
      const passwordHash = await bcrypt.hash(user.password, saltRounds);

      const [seededUser] = await sql<{ id: number }[]>`
          INSERT INTO users (username, password_hash, role, line_group)
          VALUES (${username}, ${passwordHash}, ${user.role}, ${user.lineGroup})
          ON CONFLICT (lower(username)) DO UPDATE
          SET
              password_hash = EXCLUDED.password_hash,
              role = EXCLUDED.role,
              line_group = EXCLUDED.line_group
          RETURNING id
        `;

      seededUsers.push({
        id: seededUser.id,
        username,
        role: user.role,
        lineGroup: user.lineGroup,
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
