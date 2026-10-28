// Deletes the local database, including all its data, and rebuilds it from
// the migrations, seed data and seed the users. Only touches the local database container and
// its Docker volume. Asks first unless run with --yes.
// Run with: npm run db:reset (or npm run db:reset -- --yes)

import {
  checkDocker,
  confirmReset,
  ensureEnvFile,
  main,
  migrateDatabase,
  removeDatabase,
  seedDatabase,
  startDatabase,
  seedUsers,
} from "./lib/local-env.mjs";

await main(
  [
    ["Confirming", confirmReset],
    ["Preparing .env", ensureEnvFile],
    ["Checking Docker", checkDocker],
    ["Removing the local database", removeDatabase],
    ["Starting the database", startDatabase],
    ["Applying migrations", migrateDatabase],
    ["Seeding test users", seedUsers],
    ["Seeding scenario data", seedDatabase],
  ],
  "Database reset complete.",
);
