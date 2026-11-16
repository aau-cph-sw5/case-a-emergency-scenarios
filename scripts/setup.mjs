// Prepares a fresh clone, or refreshes an existing one, for local development.
// Safe to re-run: every step skips work that is already done.
// Run with: npm run setup

import {
  checkDocker,
  checkNode,
  ensureEnvFile,
  ensureJwtSecret,
  installDependencies,
  main,
  migrateDatabase,
  seedDatabase,
  startDatabase,
  seedUsers,
} from "./lib/local-env.mjs";

await main(
  [
    ["Checking Node.js", checkNode],
    ["Installing dependencies", installDependencies],
    ["Preparing .env", ensureEnvFile],
    ["Preparing JWT secret", ensureJwtSecret],
    ["Checking Docker", checkDocker],
    ["Starting the database", startDatabase],
    ["Applying migrations", migrateDatabase],
    ["Seeding test users", seedUsers],
    ["Seeding scenario data", seedDatabase],
  ],
  "Setup complete. Start the API and web client with `npm run dev:web`.",
);
