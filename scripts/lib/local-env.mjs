// Shared steps for preparing the local development environment.
// Used by scripts/setup.mjs and scripts/db-reset.mjs.
// Uses only Node built-ins so it can run before `npm ci`.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FETCH_HINT, SEED_DATA_DIR, findSeedData } from "./seed-data.mjs";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const MIN_NODE = [20, 19, 0];

export class SetupError extends Error {}

export function step(message) {
  console.log(`\n▸ ${message}`);
}

export function note(message) {
  console.log(`  ${message}`);
}

function run(command, args, { quiet = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: quiet ? "ignore" : "inherit",
    shell: process.platform === "win32" && command === "npm",
  });
  return result.error ? { status: null, error: result.error } : result;
}

function npm(args) {
  // Under `npm run`, npm_execpath points at npm's own CLI script.
  return process.env.npm_execpath
    ? run(process.execPath, [process.env.npm_execpath, ...args])
    : run("npm", args);
}

export function checkNode() {
  const current = process.versions.node.split(".").map(Number);
  const tooOld =
    current[0] < MIN_NODE[0] ||
    (current[0] === MIN_NODE[0] && current[1] < MIN_NODE[1]);
  if (tooOld) {
    throw new SetupError(
      `Node.js ${MIN_NODE.join(".")} or later is required, but you are running ${process.versions.node}.`,
    );
  }
  note(`Node.js ${process.versions.node}`);
}

export function installDependencies() {
  const lockFile = path.join(root, "package-lock.json");
  const installedLock = path.join(root, "node_modules/.package-lock.json");
  const upToDate =
    existsSync(installedLock) &&
    statSync(installedLock).mtimeMs >= statSync(lockFile).mtimeMs;

  if (upToDate) {
    note("Dependencies are up to date.");
    return;
  }
  if (npm(["ci"]).status !== 0) {
    throw new SetupError("`npm ci` failed. See the output above.");
  }
}

export function ensureEnvFile() {
  const envFile = path.join(root, ".env");
  if (existsSync(envFile)) {
    note(".env already exists, leaving it untouched.");
  } else {
    copyFileSync(path.join(root, ".env.example"), envFile);
    note("Created .env from .env.example.");
  }
}

export function checkDocker() {
  const info = run("docker", ["info"], { quiet: true });
  if (info.error?.code === "ENOENT") {
    throw new SetupError(
      "Docker is not installed. Install Docker Desktop, see src/db/README.md.",
    );
  }
  if (info.status !== 0) {
    throw new SetupError(
      "Docker is installed but not running. Start Docker Desktop and try again.",
    );
  }
  if (run("docker", ["compose", "version"], { quiet: true }).status !== 0) {
    throw new SetupError(
      "The `docker compose` command is missing. Update Docker Desktop and try again.",
    );
  }
  note("Docker is running.");
}

export function startDatabase() {
  if (
    run("docker", ["compose", "up", "--detach", "--wait", "db"]).status !== 0
  ) {
    throw new SetupError(
      "The database did not start. If the database port is already in use, set POSTGRES_PORT in .env to a free port and update DATABASE_URL to match.",
    );
  }
}

export function removeDatabase() {
  const result = run("docker", [
    "compose",
    "down",
    "--volumes",
    "--remove-orphans",
  ]);
  if (result.status !== 0) {
    throw new SetupError(
      "Could not remove the local database. See the output above.",
    );
  }
}

export function migrateDatabase() {
  if (npm(["run", "db:migrate"]).status !== 0) {
    throw new SetupError("Database migration failed. See the output above.");
  }
}

export function seedDatabase() {
  const { problem } = findSeedData(path.join(root, SEED_DATA_DIR));
  if (problem) {
    note(`Skipped: ${problem}`);
    note(`${FETCH_HINT} Then run \`npm run seed\`.`);
    return;
  }
  if (npm(["run", "seed"]).status !== 0) {
    throw new SetupError("Seeding failed. See the output above.");
  }
}

export async function main(steps, done) {
  try {
    for (const [message, action] of steps) {
      step(message);
      await action();
    }
    console.log(`\n✓ ${done}`);
  } catch (error) {
    if (!(error instanceof SetupError)) throw error;
    console.error(`\n✗ ${error.message}`);
    process.exitCode = 1;
  }
}
