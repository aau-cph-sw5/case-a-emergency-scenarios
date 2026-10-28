// Locates the scenario seed data, which is not in git and must be fetched from
// the project OneDrive. Used by scripts/lib/local-env.mjs and scripts/seed-scenarios.ts.
// Uses only Node built-ins so it can run before `npm ci`.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export const SEED_DATA_DIR = "docs/scenario-state";

// The private SeedDataScenario_*.json files live outside the repository
// SEED_SCENARIOS_DIR in the .env, points to that folder.
export const SEED_SCENARIOS_DIR = process.env.SEED_SCENARIOS_DIR;

export const STATIONS_FILE = "stations.json";
export const SHAFTS_FILE = "shafts.json";
const SCENARIO_PREFIX = "SeedDataScenario_";
const SCENARIO_FILES = `${SCENARIO_PREFIX}*.json`;

export const FETCH_HINT =
  "Fetch the seed data from the project OneDrive, see '#TypeScript seed loader' section in scripts/README.md.";

export function isScenarioFile(fileName) {
  return fileName.startsWith(SCENARIO_PREFIX) && fileName.endsWith(".json");
}

export function findSeedData(dir, scenariosDir) {
  if (!scenariosDir) {
    return {
      scenarioFiles: [],
      problem: `SEED_SCENARIOS_DIR is not set. Add it to .env, pointing to a folder on your pc OUTSIDE this repository that contains ${SCENARIO_FILES} files.`,
      fatal: true,
    };
  }
  const hasStations = existsSync(path.join(dir, STATIONS_FILE));
  const hasShafts = existsSync(path.join(dir, SHAFTS_FILE));
  const scenarioFiles = existsSync(scenariosDir)
    ? readdirSync(scenariosDir).filter(isScenarioFile).sort()
    : [];

  let problem = null;
  let fatal = false;
  if (!hasStations && scenarioFiles.length === 0) {
    problem = `No seed data: ${dir}/${STATIONS_FILE} and the ${SCENARIO_FILES} files in ${scenariosDir}/ are missing.`;
    fatal = true;
  } else if (!hasStations) {
    problem = `${dir}/${STATIONS_FILE} is missing. The seed loader needs it to check the stations in the scenario files.`;
    fatal = true;
  } else if (!hasShafts) {
    problem = `${dir}/${SHAFTS_FILE} is missing. The seed loader needs it, together with ${STATIONS_FILE}, to check the stations in the scenario files.`;
    fatal = true;
  } else if (scenarioFiles.length === 0) {
    problem = `No ${SCENARIO_FILES} files in ${scenariosDir}/, so there are no scenarios to seed.`;
  }

  return { scenarioFiles, problem, fatal };
}
