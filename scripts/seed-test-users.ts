import bcrypt from "bcryptjs";
import { getDatabase } from "../src/db/client.js";

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
];

async function main() {
  const sql = getDatabase();

  try {
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

      const [seededUser] = await sql<{ id: number }[]>`
        INSERT INTO users (username, password_hash, role)
        VALUES (${user.username}, ${passwordHash}, ${user.role})
        ON CONFLICT (lower(username)) DO UPDATE
        SET
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role
        RETURNING id
      `;

      console.log(`Seeded ${user.username} with id ${seededUser.id}`);
    }
  } finally {
    await sql.end();
  }
}

void main().catch((error: unknown) => {
  console.error("Failed to seed test users:", error);
  process.exitCode = 1;
});
