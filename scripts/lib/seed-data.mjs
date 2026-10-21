// Locates the scenario seed data, which is not in git and must be fetched from
// the project OneDrive. Used by scripts/lib/local-env.mjs and scripts/seed-scenarios.ts.
// Uses only Node built-ins so it can run before `npm ci`.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const SEED_DATA_DIR = "docs/scenario-state";
export const STATIONS_FILE = "stations.json";
const SCENARIO_FILES = "SeedDataScenario_*.json";

export const FETCH_HINT =
  "Fetch the seed data from the project OneDrive, see scripts/README.md.";

export function isScenarioFile(fileName) {
  return fileName.startsWith("SeedDataScenario_") && fileName.endsWith(".json");
}

// `dir` is the seed data folder. `problem` describes what is missing, or is
// null when there is enough to seed.
export function findSeedData(dir) {
  const hasStations = existsSync(path.join(dir, STATIONS_FILE));
  const scenarioFiles = existsSync(dir)
    ? readdirSync(dir).filter(isScenarioFile).sort()
    : [];

  let problem = null;
  if (!hasStations && scenarioFiles.length === 0) {
    problem = `No seed data in ${SEED_DATA_DIR}/: ${STATIONS_FILE} and the ${SCENARIO_FILES} files are missing.`;
  } else if (!hasStations) {
    problem = `${SEED_DATA_DIR}/${STATIONS_FILE} is missing. The seed loader needs it to check the stations in the scenario files.`;
  } else if (scenarioFiles.length === 0) {
    problem = `No ${SCENARIO_FILES} files in ${SEED_DATA_DIR}/, so there are no scenarios to seed.`;
  }

  return { scenarioFiles, problem };
}
