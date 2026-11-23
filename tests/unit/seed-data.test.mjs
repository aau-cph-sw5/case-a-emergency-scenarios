import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findSeedData, isInsideRepo } from "../../scripts/lib/seed-data.mjs";

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
  });
});

test("reports that the scenario files are missing", () => {
  const dir = seedDir(["stations.json", "shafts.json"]);
  const { problem } = findSeedData(dir, dir);
  assert.match(problem, /No SeedDataScenario_\*\.json files/);
});

test("reports that the scenario folder does not exist", () => {
  const dir = seedDir(["stations.json", "shafts.json"]);
  const missing = path.join(dir, "no-such-folder");
  const { problem } = findSeedData(dir, missing);
  assert.match(problem, /which does not exist/);
});

test("refuses a scenario folder inside the repository", () => {
  const repo = seedDir(["stations.json", "shafts.json"]);
  const inside = path.join(repo, "seed");
  mkdirSync(inside);
  writeFileSync(path.join(inside, "SeedDataScenario_1.json"), "{}");
  for (const folder of [repo, inside]) {
    const { scenarioFiles, problem } = findSeedData(repo, folder, repo);
    assert.match(problem, /is inside this repository/);
    assert.deepEqual(scenarioFiles, []);
  }
});

test("accepts a folder next to the repository with a similar name", () => {
  const parent = seedDir([]);
  const repo = path.join(parent, "repo");
  const sibling = path.join(parent, "repo-seed");
  mkdirSync(repo);
  mkdirSync(sibling);
  assert.equal(isInsideRepo(sibling, repo), false);
  assert.equal(isInsideRepo(path.join(repo, "a", ".."), repo), true);
});

test("reports that stations.json is missing", () => {
  const dir = seedDir(["SeedDataScenario_1.json"]);
  const { problem } = findSeedData(dir, dir);
  assert.match(problem, /stations\.json is missing/);
});

test("reports that both are missing, also when the folder does not exist", () => {
  for (const dir of [seedDir([]), path.join(tmpdir(), "seed-data-missing")]) {
    const { problem } = findSeedData(dir, dir);
    assert.match(problem, /^No seed data: .*stations\.json and the/);
  }
});

test("reports that shafts.json is missing", () => {
  const dir = seedDir(["stations.json", "SeedDataScenario_1.json"]);
  const { problem } = findSeedData(dir, dir);
  assert.match(problem, /shafts\.json is missing/);
});

test("reads the scenario files from their own folder", () => {
  const dir = seedDir(["stations.json", "shafts.json"]);
  const scenariosDir = seedDir(["SeedDataScenario_1.json"]);
  assert.deepEqual(findSeedData(dir, scenariosDir), {
    scenarioFiles: ["SeedDataScenario_1.json"],
    problem: null,
  });
});

test("refuses to seed when SEED_SCENARIOS_DIR is not set", () => {
  const { problem } = findSeedData(seedDir(["stations.json"]), undefined);
  assert.match(problem, /SEED_SCENARIOS_DIR is not set/);
});
