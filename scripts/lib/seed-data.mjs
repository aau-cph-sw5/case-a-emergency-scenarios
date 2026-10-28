// Locates the scenario seed data, which is not in git and must be fetched from
// the project OneDrive. Used by scripts/lib/local-env.mjs and scripts/seed-scenarios.ts.
// Uses only Node built-ins so it can run before `npm ci`.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const SEED_DATA_DIR = "docs/scenario-state";
export const STATIONS_FILE = "stations.json";
export const SHAFTS_FILE = "shafts.json";
const SCENARIO_PREFIX = "SeedDataScenario_";
const SCENARIO_FILES = `${SCENARIO_PREFIX}*.json`;

export const FETCH_HINT =
  "Fetch the seed data from the project OneDrive, see scripts/README.md.";

export function isScenarioFile(fileName) {
  return fileName.startsWith(SCENARIO_PREFIX) && fileName.endsWith(".json");
}

// `dir` is the seed data folder. `problem` describes what is missing, or is
// null when there is enough to seed. `fatal` is true when the seed loader
// cannot run at all, and false when it can run but has no scenarios to load.
export function findSeedData(dir) {
  const hasStations = existsSync(path.join(dir, STATIONS_FILE));
  const hasShafts = existsSync(path.join(dir, SHAFTS_FILE));
  const scenarioFiles = existsSync(dir)
    ? readdirSync(dir).filter(isScenarioFile).sort()
    : [];

  let problem = null;
  let fatal = false;
  if (!hasStations && scenarioFiles.length === 0) {
    problem = `No seed data in ${SEED_DATA_DIR}/: ${STATIONS_FILE} and the ${SCENARIO_FILES} files are missing.`;
    fatal = true;
  } else if (!hasStations) {
    problem = `${SEED_DATA_DIR}/${STATIONS_FILE} is missing. The seed loader needs it to check the stations in the scenario files.`;
    fatal = true;
  } else if (!hasShafts) {
    problem = `${SEED_DATA_DIR}/${SHAFTS_FILE} is missing. The seed loader needs it, together with ${STATIONS_FILE}, to check the stations in the scenario files.`;
    fatal = true;
  } else if (scenarioFiles.length === 0) {
    problem = `No ${SCENARIO_FILES} files in ${SEED_DATA_DIR}/, so there are no scenarios to seed.`;
  }

  return { scenarioFiles, problem, fatal };
  
}
