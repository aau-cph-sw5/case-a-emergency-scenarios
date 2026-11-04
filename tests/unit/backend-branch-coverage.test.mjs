import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  new URL("../../scripts/check-backend-branches.mjs", import.meta.url),
);

test("backend branch threshold uses weighted src counts and fails closed", (t) => {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "backend-branches-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "coverage"));
  const summary = (covered) => ({
    [path.join(root, "src/a.ts")]: { branches: { covered, total: 4 } },
    [path.join(root, "web/src/b.ts")]: { branches: { covered: 0, total: 100 } },
  });
  const run = (data) => {
    writeFileSync(
      path.join(root, "coverage/coverage-summary.json"),
      JSON.stringify(data),
    );
    return spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });
  };
  assert.equal(run(summary(3)).status, 0);
  assert.equal(run(summary(2)).status, 1);
  assert.equal(run({}).status, 1);
  assert.equal(
    run({ [path.join(root, "src/a.ts")]: { branches: { total: 4 } } }).status,
    1,
  );
});
