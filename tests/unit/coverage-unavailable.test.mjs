import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../../scripts/coverage-report.mjs", import.meta.url),
);

test("missing or incomplete coverage updates the comment and fails the gate", (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "coverage-unavailable-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "coverage/jest"), { recursive: true });
  const nodeFile = path.join(root, "coverage/coverage-final.json");
  const jestFile = path.join(root, "coverage/jest/coverage-final.json");
  const valid = JSON.stringify({
    [path.join(root, "src/example.ts")]: {
      statementMap: { 0: { start: { line: 1 } } },
      s: { 0: 1 },
    },
  });
  const run = (args = [], extra = {}) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, COVERAGE_BASE: "HEAD", ...extra },
    });
  writeFileSync(nodeFile, valid);
  let result = run();
  assert.equal(result.status, 0);
  assert.match(
    result.stdout,
    /<!-- coverage-report -->[\s\S]*Coverage unavailable/,
  );
  assert.doesNotMatch(result.stdout, /Overall application line coverage/);
  assert.equal(run(["--check"]).status, 1);
  assert.equal(run(["--write-lcov"]).status, 1);
  writeFileSync(jestFile, "invalid JSON");
  assert.match(
    run().stdout,
    /Missing or invalid coverage data: coverage\/jest/,
  );
  writeFileSync(jestFile, valid);
  result = run([], { COVERAGE_INPUTS_COMPLETE: "false" });
  assert.match(result.stdout, /Coverage unavailable/);
  assert.equal(
    run(["--check"], { COVERAGE_INPUTS_COMPLETE: "false" }).status,
    1,
  );
  rmSync(nodeFile);
  assert.match(
    run().stdout,
    /Missing or invalid coverage data: coverage\/coverage-final/,
  );
  assert.equal(readFileSync(jestFile, "utf8"), valid);
});
