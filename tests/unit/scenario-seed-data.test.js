// Checks every scenario seed file in docs/scenario-state/ against the scenario
// contract. The seed files are plain JSON, so no database is needed.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { validate } from "../../stub-server/contract-validator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.join(__dirname, "../../docs/scenario-state");

const seedFiles = fs
  .readdirSync(seedDir)
  .filter((file) => file.endsWith(".json"));

for (const file of seedFiles) {
  const seed = JSON.parse(fs.readFileSync(path.join(seedDir, file), "utf8"));

  test(`${file} matches scenario.schema.json`, () => {
    assert.deepEqual(validate(seed, ["scenario.schema.json"]), []);
  });

  // The schema cannot express uniqueness across versions, so it is checked here.
  test(`${file} has unique versions and a currentVersion that exists`, () => {
    const versions = seed.versions.map((entry) => entry.version);

    assert.deepEqual(versions, [...new Set(versions)]);
    assert.ok(versions.includes(seed.currentVersion));
  });
}
