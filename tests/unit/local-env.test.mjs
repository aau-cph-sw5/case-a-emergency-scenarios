import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  dependenciesUpToDate,
  lockfileHash,
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
