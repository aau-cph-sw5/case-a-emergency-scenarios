import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../scripts/coverage-report.mjs", import.meta.url),
);

test("overall coverage is enforced even when only tests change", (t) => {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "coverage-floor-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  writeFileSync(path.join(root, "test.txt"), "before");
  git("add", "test.txt");
  git("commit", "-qm", "base");
  const base = git("rev-parse", "HEAD");
  writeFileSync(path.join(root, "test.txt"), "after");
  git("commit", "-qam", "test-only change");
  mkdirSync(path.join(root, "coverage/jest"), { recursive: true });
  const entry = (covered) => ({
    statementMap: Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [i, { start: { line: i + 1 } }]),
    ),
    s: Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [i, i < covered ? 1 : 0]),
    ),
  });
  writeFileSync(
    path.join(root, "coverage/jest/coverage-final.json"),
    JSON.stringify({ [path.join(root, "other.js")]: entry(0) }),
  );
  const run = (covered, ...args) => {
    writeFileSync(
      path.join(root, "coverage/coverage-final.json"),
      JSON.stringify({ [path.join(root, "src/app.ts")]: entry(covered) }),
    );
    return spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, COVERAGE_BASE: base },
    });
  };
  assert.equal(run(4, "--check").status, 0);
  assert.equal(run(3, "--check").status, 1);
  const report = run(3);
  assert.match(report.stdout, /No eligible application source files changed/);
  assert.match(report.stdout, /60% \(3\/5\) \| ❌/);
  assert.match(
    report.stdout,
    /Overall application line coverage must reach 80%/,
  );
});
