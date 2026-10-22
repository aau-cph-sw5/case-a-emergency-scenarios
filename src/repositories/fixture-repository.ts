import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Scenario } from "../../shared/types/v1/scenario.js";

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

export function findScenario(scenarioId: string): Scenario | undefined {
  return readById("scenarios", scenarioId) as Scenario | undefined;
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

type Activation = {
  activationId: string;
  scenarioId: string;
  startedAt: string;
  endedAt: string | null;
  status: "ACTIVE";
  actor: string;
  deployments: { status: "UNMANNED"; staff: null; fulfills: string }[];
};

// In-memory until the database is populated, so activations reset when the
// server restarts. Seeded with the fixture's activation, like the stub.
type StoredActivation = Pick<Activation, "scenarioId"> & {
  deployments: { fulfills: string }[];
};
const activations: StoredActivation[] = [
  getScenarioState() as StoredActivation,
];

// The stations that require manning in an active scenario.
export function activeStations(): Set<string> {
  return new Set(
    activations.flatMap((a) => a.deployments.map((d) => d.fulfills)),
  );
}

// The most recently activated scenario, for clients that connect later.
export function latestActivation(): StoredActivation | undefined {
  return activations.at(-1);
}

export type ActivationResult =
  | { kind: "ok"; activation: Activation }
  | { kind: "not-found" }
  | { kind: "already-active" };

// Several scenarios may be active on one line, so only the same scenario
// twice is refused (Metro on MET-A-007).
export function activateScenario(
  scenarioId: string,
  actor: string,
): ActivationResult {
  const scenario = findScenario(scenarioId);
  if (scenario === undefined) return { kind: "not-found" };
  if (activations.some((a) => a.scenarioId === scenarioId)) {
    return { kind: "already-active" };
  }

  const version = scenario.versions.find(
    (v) => v.version === scenario.currentVersion,
  );
  const activation: Activation = {
    activationId: `ACT-${scenarioId}-${activations.length + 1}`,
    scenarioId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "ACTIVE",
    actor,
    deployments: (version?.stationRequirements ?? []).map((r) => ({
      status: "UNMANNED",
      staff: null,
      fulfills: r.station,
    })),
  };
  activations.push(activation);
  return { kind: "ok", activation };
}
