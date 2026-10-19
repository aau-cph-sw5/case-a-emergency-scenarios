// Deletes the local database, including all its data, and rebuilds it from
// the migrations and seed data. Only touches the local Docker volume.
// Run with: npm run db:reset

import {
  checkDocker,
  ensureEnvFile,
  main,
  migrateDatabase,
  removeDatabase,
  seedDatabase,
  startDatabase,
} from "./lib/local-env.mjs";

await main(
  [
    ["Preparing .env", ensureEnvFile],
    ["Checking Docker", checkDocker],
    ["Removing the local database", removeDatabase],
    ["Starting the database", startDatabase],
    ["Applying migrations", migrateDatabase],
    ["Seeding scenario data", seedDatabase],
  ],
  "Database reset complete.",
);
