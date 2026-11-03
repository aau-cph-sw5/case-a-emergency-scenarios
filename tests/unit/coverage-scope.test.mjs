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

test("startup entry points do not count towards application coverage", (t) => {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "coverage-scope-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  git("init", "-q");
  git("config", "user.name", "Test");
  git("config", "user.email", "test@example.com");
  mkdirSync(path.join(root, "mobile"));
  mkdirSync(path.join(root, "web/src"), { recursive: true });
  mkdirSync(path.join(root, "coverage/jest"), { recursive: true });
  const names = ["mobile/index.ts", "web/src/main.tsx", "web/src/App.tsx"];
  for (const name of names) writeFileSync(path.join(root, name), "before");
  git("add", "mobile", "web");
  git("commit", "-qm", "base");
  const base = git("rev-parse", "HEAD");
  for (const name of names) writeFileSync(path.join(root, name), "after");
  git("add", "mobile", "web");
  git("commit", "-qm", "change");
  const entry = (covered) => ({
    statementMap: { 0: { start: { line: 1 } } },
    s: { 0: covered },
  });
  writeFileSync(
    path.join(root, "coverage/coverage-final.json"),
    JSON.stringify({ [path.join(root, "scripts/ignored.mjs")]: entry(1) }),
  );
  writeFileSync(
    path.join(root, "coverage/jest/coverage-final.json"),
    JSON.stringify(
      Object.fromEntries(
        names.map((name, index) => [
          path.join(root, name),
          entry(index === 2 ? 1 : 0),
        ]),
      ),
    ),
  );
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, COVERAGE_BASE: base },
    });
  const report = run();
  assert.equal(report.status, 0);
  assert.match(report.stdout, /100\.00% \(1\/1\)/);
  assert.match(report.stdout, /web\/src\/App\.tsx/);
  assert.doesNotMatch(report.stdout, /mobile\/index\.ts|web\/src\/main\.tsx/);
  assert.equal(run("--check").status, 0);
});
