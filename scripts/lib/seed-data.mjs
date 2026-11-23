// Locates the scenario seed data, which is not in git and must be fetched from
// the project OneDrive. Used by scripts/lib/local-env.mjs and scripts/seed-scenarios.ts.
// Uses only Node built-ins so it can run before `npm ci`.

import { existsSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SEED_DATA_DIR = "docs/scenario-state";

// The private SeedDataScenario_*.json files live outside the repository
// SEED_SCENARIOS_DIR in the .env, points to that folder.
export const SEED_SCENARIOS_DIR = process.env.SEED_SCENARIOS_DIR;

export const STATIONS_FILE = "stations.json";
export const SHAFTS_FILE = "shafts.json";
const SCENARIO_PREFIX = "SeedDataScenario_";
const SCENARIO_FILES = `${SCENARIO_PREFIX}*.json`;

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const FETCH_HINT =
  "Fetch the seed data from the project OneDrive, see '#TypeScript seed loader' section in scripts/README.md.";

export function isScenarioFile(fileName) {
  return fileName.startsWith(SCENARIO_PREFIX) && fileName.endsWith(".json");
}

// True when folder is the repository or a folder inside it. Symbolic links are
// followed, so a link inside the repository to a folder outside it is allowed.
export function isInsideRepo(folder, repoRoot = REPO_ROOT) {
  const real = (p) => (existsSync(p) ? realpathSync(p) : path.resolve(p));
  const relative = path.relative(real(repoRoot), real(folder));
  return (
    relative === "" ||
    (relative.split(path.sep)[0] !== ".." && !path.isAbsolute(relative))
  );
}

// Returns the scenario files to seed, or a problem that stops `npm run seed`.
// `npm run setup` only warns about the problem and skips seeding.
export function findSeedData(dir, scenariosDir, repoRoot = REPO_ROOT) {
  if (!scenariosDir) {
    return {
      scenarioFiles: [],
      problem: `SEED_SCENARIOS_DIR is not set. Add it to .env, pointing to a folder on your pc OUTSIDE this repository that contains ${SCENARIO_FILES} files.`,
    };
  }
  if (isInsideRepo(scenariosDir, repoRoot)) {
    return {
      scenarioFiles: [],
      problem: `SEED_SCENARIOS_DIR (${scenariosDir}) is inside this repository. Move the seed data to a folder OUTSIDE the repository, so it can never be committed, and update SEED_SCENARIOS_DIR in .env.`,
    };
  }
  const hasStations = existsSync(path.join(dir, STATIONS_FILE));
  const hasShafts = existsSync(path.join(dir, SHAFTS_FILE));
  const folderExists = existsSync(scenariosDir);
  const scenarioFiles = folderExists
    ? readdirSync(scenariosDir).filter(isScenarioFile).sort()
    : [];

  let problem = null;
  if (!hasStations && scenarioFiles.length === 0) {
    problem = `No seed data: ${dir}/${STATIONS_FILE} and the ${SCENARIO_FILES} files in ${scenariosDir}/ are missing.`;
  } else if (!hasStations) {
    problem = `${dir}/${STATIONS_FILE} is missing. The seed loader needs it to check the stations in the scenario files.`;
  } else if (!hasShafts) {
    problem = `${dir}/${SHAFTS_FILE} is missing. The seed loader needs it, together with ${STATIONS_FILE}, to check the stations in the scenario files.`;
  } else if (!folderExists) {
    problem = `SEED_SCENARIOS_DIR points to ${scenariosDir}/, which does not exist. Check the path in .env.`;
  } else if (scenarioFiles.length === 0) {
    problem = `No ${SCENARIO_FILES} files in ${scenariosDir}/, so there are no scenarios to seed.`;
  }

  return { scenarioFiles, problem };
}
