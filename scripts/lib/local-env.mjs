// Shared steps for preparing the local development environment.
// Used by scripts/setup.mjs and scripts/db-reset.mjs.
// Uses only Node built-ins so it can run before `npm ci`.

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { root, run, npm } from "./run.mjs";
import { FETCH_HINT, SEED_DATA_DIR, findSeedData } from "./seed-data.mjs";

const MIN_NODE = [20, 19, 0];
// Fingerprint of the lockfile that node_modules was last installed from.
// Lives inside node_modules, so deleting node_modules also forces a reinstall.
const INSTALLED_LOCK_HASH = "node_modules/.setup-lockfile-hash";
// Long enough for a slow `docker info`, short enough that a stuck Docker
// daemon is reported instead of hanging setup.
const DOCKER_TIMEOUT_MS = 15_000;
// The healthcheck in compose.yaml gives up after about a minute.
const DB_WAIT_TIMEOUT_S = "120";
// Key of the database volume in compose.yaml.
const DB_VOLUME = "metro_postgres_data";

export class SetupError extends Error {}

export function step(message) {
  console.log(`\n▸ ${message}`);
}

export function note(message) {
  console.log(`  ${message}`);
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

export function lockfileHash(dir = root) {
  const lockfile = readFileSync(path.join(dir, "package-lock.json"));
  return createHash("sha256").update(lockfile).digest("hex");
}

// Compares file contents, not timestamps, so a lockfile restored or copied
// with an old timestamp is still detected as changed.
export function dependenciesUpToDate(dir = root) {
  try {
    const installed = readFileSync(path.join(dir, INSTALLED_LOCK_HASH), "utf8");
    return installed.trim() === lockfileHash(dir);
  } catch {
    // No saved hash: never installed by setup, or node_modules was deleted.
    return false;
  }
}

export function installDependencies() {
  if (dependenciesUpToDate()) {
    note("Dependencies are up to date.");
    return;
  }
  // Hash before the install, so it matches the lockfile npm ci used.
  const hash = lockfileHash();
  if (npm(["ci"]).status !== 0) {
    throw new SetupError("`npm ci` failed. See the output above.");
  }
  writeFileSync(path.join(root, INSTALLED_LOCK_HASH), `${hash}\n`);
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
  const info = run("docker", ["info"], {
    quiet: true,
    timeout: DOCKER_TIMEOUT_MS,
  });
  if (info.error?.code === "ENOENT") {
    throw new SetupError(
      "Docker is not installed. Install Docker Desktop, see src/db/README.md.",
    );
  }
  if (info.error?.code === "ETIMEDOUT") {
    throw new SetupError(
      "Docker is not responding. If Docker Desktop is still starting, wait for it to finish and try again.",
    );
  }
  if (info.status !== 0) {
    throw new SetupError(
      "Docker is installed but not running. Start Docker Desktop and try again.",
    );
  }
  const compose = run("docker", ["compose", "version"], {
    quiet: true,
    timeout: DOCKER_TIMEOUT_MS,
  });
  if (compose.status !== 0) {
    throw new SetupError(
      "The `docker compose` command is missing. Update Docker Desktop and try again.",
    );
  }
  note("Docker is running.");
}

export function startDatabase() {
  const up = run("docker", [
    "compose",
    "up",
    "--detach",
    "--wait",
    "--wait-timeout",
    DB_WAIT_TIMEOUT_S,
    "db",
  ]);
  if (up.status !== 0) {
    throw new SetupError(
      "The database did not start. If the database port is already in use, set POSTGRES_PORT in .env to a free port and update DATABASE_URL to match.",
    );
  }
}

// `--yes` skips the question. Without a terminal to ask in, refuse instead of
// deleting data nobody confirmed.
export function resetConfirmation(args, interactive) {
  if (args.includes("--yes")) return "skip";
  return interactive ? "ask" : "refuse";
}

export async function confirmReset(args = process.argv.slice(2)) {
  const decision = resetConfirmation(
    args,
    Boolean(process.stdin.isTTY && process.stdout.isTTY),
  );
  if (decision === "skip") {
    note("Confirmed with --yes.");
    return;
  }
  if (decision === "refuse") {
    throw new SetupError(
      "Refusing to delete the local database without confirmation. Run `npm run db:reset -- --yes` to confirm.",
    );
  }
  const answer = await ask(
    "  This deletes all data in the local database. Continue? [y/N] ",
  );
  if (!/^y(es)?$/i.test(answer.trim())) {
    throw new SetupError("Cancelled. Nothing was deleted.");
  }
}

// Resolves with the typed answer, or with "" on Ctrl+C or Ctrl+D.
function ask(question) {
  return new Promise((resolve) => {
    const prompt = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    let answered = false;
    prompt.question(question, (answer) => {
      answered = true;
      prompt.close();
      resolve(answer);
    });
    prompt.on("SIGINT", () => prompt.close());
    prompt.on("close", () => {
      if (answered) return;
      // Ctrl+C and Ctrl+D leave the cursor on the prompt line.
      console.log();
      resolve("");
    });
  });
}

// Removes only the db container and its data volume, so other services and
// volumes in the compose project are left alone.
export function removeDatabase() {
  const config = run("docker", ["compose", "config", "--format", "json"], {
    capture: true,
    timeout: DOCKER_TIMEOUT_MS,
  });
  if (config.status !== 0) {
    throw new SetupError("Could not read compose.yaml. See the output above.");
  }
  const volume = JSON.parse(config.stdout).volumes[DB_VOLUME].name;

  if (
    run("docker", ["compose", "rm", "--stop", "--force", "db"]).status !== 0
  ) {
    throw new SetupError(
      "Could not remove the database container. See the output above.",
    );
  }
  // `docker volume rm` fails for a volume that was never created.
  const exists =
    run("docker", ["volume", "inspect", volume], { quiet: true }).status === 0;
  if (
    exists &&
    run("docker", ["volume", "rm", volume], { capture: true }).status !== 0
  ) {
    throw new SetupError(
      `Could not remove the ${volume} volume. See the output above.`,
    );
  }
  note(
    exists ? `Removed the ${volume} volume.` : "There was no data to remove.",
  );
}

export function migrateDatabase() {
  if (
    run("docker", ["compose", "run", "--rm", "flyway", "migrate"]).status !== 0
  ) {
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
