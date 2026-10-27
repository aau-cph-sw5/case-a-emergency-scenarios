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
  dependenciesUpToDate,
  ensureJwtSecret,
  lockfileHash,
  resetConfirmation,
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
