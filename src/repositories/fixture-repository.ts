import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// This file is temporary until the real database is populated
// Right now it just imports the fixture data from the fixtures folder
// Then this will be the repository layer where the queries to the DB live.
const fixturesDirectory = fileURLToPath(
  new URL("../../fixtures/v1/", import.meta.url),
);

function readJson(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(path.join(fixturesDirectory, relativePath), "utf8"),
  );
}

function readById(folder: string, id: string): unknown | undefined {
  const available = readdirSync(path.join(fixturesDirectory, folder))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length));

  return available.includes(id)
    ? readJson(path.join(folder, `${id}.json`))
    : undefined;
}

export function getScenarioState(): unknown {
  return readJson("scenario-state.json");
}

export function listScenarios(): unknown {
  return readJson("scenarios.json");
}

export function findScenario(scenarioId: string): unknown | undefined {
  return readById("scenarios", scenarioId);
}

export function findMetroLine(lineId: string): unknown | undefined {
  return readById("metro-lines", lineId);
}

export type TestAccount = {
  userId: string;
  username: string;
  role: "STEWARD" | "OPERATOR";
  passwordHash: string;
};

export function listTestAccounts(): TestAccount[] {
  return readJson("test-accounts.json") as TestAccount[];
}
