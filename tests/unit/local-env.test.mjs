import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  automaticSeedSettings,
  dependenciesUpToDate,
  ensureJwtSecret,
  lockfileHash,
  resetConfirmation,
  seedReferenceData,
  SetupError,
} from "../../scripts/lib/local-env.mjs";

function project(lockfile) {
  const dir = mkdtempSync(path.join(tmpdir(), "local-env-"));
  mkdirSync(path.join(dir, "node_modules"));
  writeFileSync(path.join(dir, "package-lock.json"), lockfile);
  return dir;
}

function markInstalled(dir) {
  writeFileSync(
    path.join(dir, "node_modules/.setup-lockfile-hash"),
    `${lockfileHash(dir)}\n`,
  );
}

test("is not up to date when setup never installed", () => {
  assert.equal(dependenciesUpToDate(project('{"v":1}')), false);
});

test("is up to date when the lockfile matches the last install", () => {
  const dir = project('{"v":1}');
  markInstalled(dir);
  assert.equal(dependenciesUpToDate(dir), true);
});

test("is not up to date when the lockfile content changed", () => {
  const dir = project('{"v":1}');
  markInstalled(dir);
  writeFileSync(path.join(dir, "package-lock.json"), '{"v":2}');
  assert.equal(dependenciesUpToDate(dir), false);
});

test("detects a changed lockfile that has an old timestamp", () => {
  const dir = project('{"v":1}');
  markInstalled(dir);
  const lockfile = path.join(dir, "package-lock.json");
  writeFileSync(lockfile, '{"v":2}');
  const old = new Date("2020-01-01T00:00:00Z");
  utimesSync(lockfile, old, old);
  assert.equal(dependenciesUpToDate(dir), false);
});

test("stays up to date when only the timestamp changed", () => {
  const dir = project('{"v":1}');
  markInstalled(dir);
  const now = new Date();
  utimesSync(path.join(dir, "package-lock.json"), now, now);
  assert.equal(dependenciesUpToDate(dir), true);
});

test("db:reset skips the question when run with --yes", () => {
  assert.equal(resetConfirmation(["--yes"], true), "skip");
  assert.equal(resetConfirmation(["--yes"], false), "skip");
});

test("db:reset asks when run in a terminal without --yes", () => {
  assert.equal(resetConfirmation([], true), "ask");
});

test("db:reset refuses without a terminal and without --yes", () => {
  assert.equal(resetConfirmation([], false), "refuse");
});

test("generates a JWT secret when .env has no value", () => {
  const dir = project('{"v":1}');
  writeFileSync(path.join(dir, ".env"), "DATABASE_URL=example\nJWT_SECRET=\n");

  ensureJwtSecret(dir);

  const env = readFileSync(path.join(dir, ".env"), "utf8");
  assert.match(env, /^JWT_SECRET=[A-Za-z0-9_-]{64}$/m);
});

test("does not replace an existing JWT secret", () => {
  const dir = project('{"v":1}');
  const envFile = path.join(dir, ".env");
  writeFileSync(envFile, "JWT_SECRET=keep-this-secret\n");

  ensureJwtSecret(dir);

  assert.equal(readFileSync(envFile, "utf8"), "JWT_SECRET=keep-this-secret\n");
});

test("adds a JWT secret when .env predates authentication", () => {
  const dir = project('{"v":1}');
  writeFileSync(path.join(dir, ".env"), "DATABASE_URL=example\n");

  ensureJwtSecret(dir);

  const env = readFileSync(path.join(dir, ".env"), "utf8");
  assert.match(env, /^JWT_SECRET=[A-Za-z0-9_-]{64}$/m);
});

function seedProject() {
  const parent = mkdtempSync(path.join(tmpdir(), "setup-seed-"));
  const repo = path.join(parent, "repo");
  const scenarios = path.join(parent, "scenarios");
  const network = path.join(parent, "network data.json");
  mkdirSync(path.join(repo, "docs", "scenario-state"), { recursive: true });
  mkdirSync(scenarios);
  writeFileSync(path.join(repo, "docs/scenario-state/stations.json"), "[]");
  writeFileSync(path.join(repo, "docs/scenario-state/shafts.json"), "[]");
  writeFileSync(path.join(scenarios, "SeedDataScenario_1.json"), "{}");
  writeFileSync(network, "{}");
  writeFileSync(
    path.join(repo, ".env"),
    `NETWORK_SEED_FILE="${network}"\nSEED_SCENARIOS_DIR="${scenarios}"\n`,
  );
  return { repo, network, scenarios };
}

function runSeeds(repo, overrides = {}) {
  const calls = [];
  const warnings = [];
  const options = {
    rootDir: repo,
    environment: {},
    runNpm: (args) => {
      calls.push(args);
      return { status: 0 };
    },
    reportWarning: (message) => warnings.push(message),
    reportNote: () => {},
    ...overrides,
  };
  seedReferenceData(options);
  return { calls, warnings };
}

test("setup seeds the network before scenarios with quoted paths", () => {
  const { repo } = seedProject();
  assert.deepEqual(runSeeds(repo).calls, [
    ["run", "seed:network"],
    ["run", "seed"],
  ]);
});

test("setup skips both seeds when no network file is configured", () => {
  const { repo, scenarios } = seedProject();
  writeFileSync(path.join(repo, ".env"), `SEED_SCENARIOS_DIR="${scenarios}"\n`);
  const { calls, warnings } = runSeeds(repo);
  assert.deepEqual(calls, []);
  assert.match(warnings[0], /NETWORK_SEED_FILE/);
});

test("a failed network seed stops scenario seeding", () => {
  const { repo } = seedProject();
  const calls = [];
  assert.throws(
    () =>
      runSeeds(repo, {
        runNpm: (args) => {
          calls.push(args);
          return { status: 1 };
        },
      }),
    SetupError,
  );
  assert.deepEqual(calls, [["run", "seed:network"]]);
});

test("automatic seeding skips remote targets from either environment or .env", () => {
  const { repo, network } = seedProject();
  assert.deepEqual(
    runSeeds(repo, {
      environment: { SEED_DATABASE_URL: "postgresql://remote/db" },
    }).calls,
    [],
  );
  writeFileSync(
    path.join(repo, ".env"),
    `NETWORK_SEED_FILE="${network}"\nSEED_DATABASE_URL=postgresql://remote/db\n`,
  );
  assert.deepEqual(runSeeds(repo).calls, []);
});

test("inherited environment settings take precedence over .env", () => {
  assert.deepEqual(
    automaticSeedSettings(
      'NETWORK_SEED_FILE="/a path/file.json"\nSEED_DATABASE_URL=\n',
      {
        NETWORK_SEED_FILE: "/other/file.json",
        SEED_DATABASE_URL: "postgresql://remote/db",
      },
    ),
    {
      networkFile: "/other/file.json",
      scenariosDir: undefined,
      remoteTarget: true,
    },
  );
});

test("setup refuses a configured network file inside the repository", () => {
  const { repo } = seedProject();
  const inside = path.join(repo, "network.json");
  writeFileSync(inside, "{}");
  writeFileSync(path.join(repo, ".env"), `NETWORK_SEED_FILE="${inside}"\n`);
  assert.throws(() => runSeeds(repo), /outside the repository/);
});

test("setup can seed the network when scenario files are not configured", () => {
  const { repo, network } = seedProject();
  writeFileSync(path.join(repo, ".env"), `NETWORK_SEED_FILE="${network}"\n`);
  const { calls, warnings } = runSeeds(repo);
  assert.deepEqual(calls, [["run", "seed:network"]]);
  assert.match(warnings[0], /SEED_SCENARIOS_DIR/);
});
