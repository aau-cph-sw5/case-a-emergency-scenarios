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

test("the tested merge's first parent excludes changes already on the base branch", (t) => {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "coverage-base-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    }).trim();
  git("init", "-q");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  writeFileSync(path.join(root, "README.md"), "base\n");
  git("add", ".");
  git("commit", "-qm", "old base");
  const oldBase = git("rev-parse", "HEAD");
  const baseBranch = git("branch", "--show-current");
  git("branch", "feature");
  mkdirSync(path.join(root, "src"));
  writeFileSync(
    path.join(root, "src/already-merged.ts"),
    "export const value = 1;\n",
  );
  git("add", ".");
  git("commit", "-qm", "advance base");
  git("switch", "-q", "feature");
  writeFileSync(path.join(root, "README.md"), "feature\n");
  git("add", ".");
  git("commit", "-qm", "feature");
  git("switch", "-q", baseBranch);
  git("merge", "--no-ff", "--no-edit", "feature");
  mkdirSync(path.join(root, "coverage/jest"), { recursive: true });
  const entry = { statementMap: { 0: { start: { line: 1 } } }, s: { 0: 1 } };
  writeFileSync(
    path.join(root, "coverage/coverage-final.json"),
    JSON.stringify({ [path.join(root, "src/already-merged.ts")]: entry }),
  );
  writeFileSync(
    path.join(root, "coverage/jest/coverage-final.json"),
    JSON.stringify({ [path.join(root, "web/src/App.tsx")]: entry }),
  );
  const report = (base) =>
    spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        COVERAGE_BASE: base,
        COVERAGE_INPUTS_COMPLETE: "true",
      },
    });
  assert.match(report(oldBase).stdout, /src\/already-merged\.ts/);
  const result = report("HEAD^1");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /No eligible application source files changed/);
  assert.doesNotMatch(result.stdout, /already-merged\.ts/);
});
