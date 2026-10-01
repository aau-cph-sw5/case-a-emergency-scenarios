// Seeds fixtures/v1/test-accounts.json with one test account per role.
// Idempotent: re-running regenerates the same two accounts, it never appends.
// Run with: npm run seed:accounts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../fixtures/v1/test-accounts.json");
const SALT_ROUNDS = 10;

const accounts = [
  { userId: "steward-test", username: "steward-test", password: "steward-test-pw", role: "STEWARD" },
  { userId: "operator-test", username: "operator-test", password: "operator-test-pw", role: "OPERATOR" },
];

const seeded = accounts.map(({ password, ...rest }) => ({
  ...rest,
  passwordHash: bcrypt.hashSync(password, SALT_ROUNDS),
}));

fs.writeFileSync(outPath, JSON.stringify(seeded, null, 2) + "\n");

console.log(`Seeded ${seeded.length} test account(s) to ${outPath}`);
for (const account of accounts) {
  console.log(`  ${account.role.padEnd(10)} username=${account.username}  password=${account.password}`);
}