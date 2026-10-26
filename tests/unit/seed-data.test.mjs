import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findSeedData } from "../../scripts/lib/seed-data.mjs";

function seedDir(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "seed-data-"));
  for (const file of files) writeFileSync(path.join(dir, file), "{}");
  return dir;
}

test("finds no problem when stations.json and a scenario file exist", () => {
  const dir = seedDir([
    "stations.json",
    "SeedDataScenario_2.json",
    "SeedDataScenario_1.json",
    "notes.txt",
  ]);
  assert.deepEqual(findSeedData(dir), {
    scenarioFiles: ["SeedDataScenario_1.json", "SeedDataScenario_2.json"],
    problem: null,
    fatal: false,
  });
});

test("reports that the scenario files are missing, without being fatal", () => {
  const { problem, fatal } = findSeedData(seedDir(["stations.json"]));
  assert.match(problem, /No SeedDataScenario_\*\.json files/);
  assert.equal(fatal, false);
});

test("reports that stations.json is missing, as fatal", () => {
  const { problem, fatal } = findSeedData(seedDir(["SeedDataScenario_1.json"]));
  assert.match(problem, /stations\.json is missing/);
  assert.equal(fatal, true);
});

test("reports that both are missing, also when the folder does not exist", () => {
  for (const dir of [seedDir([]), path.join(tmpdir(), "seed-data-missing")]) {
    const { problem, fatal } = findSeedData(dir);
    assert.match(problem, /^No seed data in .*stations\.json and the/);
    assert.equal(fatal, true);
  }
});
