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
    "shafts.json",
    "SeedDataScenario_2.json",
    "SeedDataScenario_1.json",
    "notes.txt",
  ]);
  assert.deepEqual(findSeedData(dir, dir), {
    scenarioFiles: ["SeedDataScenario_1.json", "SeedDataScenario_2.json"],
    problem: null,
    fatal: false,
  });
});

test("reports that the scenario files are missing, without being fatal", () => {
  const dir = seedDir(["stations.json", "shafts.json"]);
  const { problem, fatal } = findSeedData(dir, dir);
  assert.match(problem, /No SeedDataScenario_\*\.json files/);
  assert.equal(fatal, false);
});

test("reports that stations.json is missing, as fatal", () => {
  const dir = seedDir(["SeedDataScenario_1.json"]);
  const { problem, fatal } = findSeedData(dir, dir);
  assert.match(problem, /stations\.json is missing/);
  assert.equal(fatal, true);
});

test("reports that both are missing, also when the folder does not exist", () => {
  for (const dir of [seedDir([]), path.join(tmpdir(), "seed-data-missing")]) {
    const { problem, fatal } = findSeedData(dir, dir);
    assert.match(problem, /^No seed data: .*stations\.json and the/);
    assert.equal(fatal, true);
  }
});

test("reports that shafts.json is missing, as fatal", () => {
  const dir = seedDir(["stations.json", "SeedDataScenario_1.json"]);
  const { problem, fatal } = findSeedData(dir, dir);
  assert.match(problem, /shafts\.json is missing/);
  assert.equal(fatal, true);
});

test("reads the scenario files from their own folder", () => {
  const dir = seedDir(["stations.json", "shafts.json"]);
  const scenariosDir = seedDir(["SeedDataScenario_1.json"]);
  assert.deepEqual(findSeedData(dir, scenariosDir), {
    scenarioFiles: ["SeedDataScenario_1.json"],
    problem: null,
    fatal: false,
  });
});

test("refuses to seed when SEED_SCENARIOS_DIR is not set", () => {
  const { problem, fatal } = findSeedData(
    seedDir(["stations.json"]),
    undefined,
  );
  assert.match(problem, /SEED_SCENARIOS_DIR is not set/);
  assert.equal(fatal, true);
});
