import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Scenario } from "../../shared/types/v1/scenario.js";

// This file is temporary until the real database is populated
// Right now it just imports the fixture data from the fixtures folder
// Then this will be the repository layer where the queries to the DB live.
const fixturesDirectory = path.resolve(process.cwd(), "fixtures/v1");

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
// server restarts. Starts empty: no scenario is active until an operator
// activates one.
export const ACTIVATION_STATUSES = ["ACTIVE", "CLOSED"] as const;
export type ActivationStatus = (typeof ACTIVATION_STATUSES)[number];

// An activation gets its sequence once its SCENARIO_ACTIVATED event is written.
type PendingActivation = Pick<Activation, "activationId" | "scenarioId"> & {
  status: ActivationStatus;
  deployments: { fulfills: string }[];
  sequence?: number;
};
type StoredActivation = PendingActivation & { sequence: number };
const activations: PendingActivation[] = [];

function isLogged(
  activation: PendingActivation,
): activation is StoredActivation {
  return activation.sequence !== undefined;
}

export function listActivations(status?: ActivationStatus): StoredActivation[] {
  const logged = activations.filter(isLogged);
  return status === undefined
    ? logged
    : logged.filter((a) => a.status === status);
}

// The stations that require manning in an active scenario.
export function activeStations(): Set<string> {
  return new Set(
    activations.flatMap((a) => a.deployments.map((d) => d.fulfills)),
  );
}

// The most recently activated scenario, for clients that connect later.
export function latestActivation(): StoredActivation | undefined {
  return activations.filter(isLogged).at(-1);
}

export function setActivationSequence(activationId: string, sequence: number) {
  const activation = activations.find((a) => a.activationId === activationId);
  if (activation) activation.sequence = sequence;
}

// Takes back an activation whose event could not be written.
export function undoActivation(activationId: string) {
  const index = activations.findIndex((a) => a.activationId === activationId);
  if (index !== -1) activations.splice(index, 1);
}

export type ActivationResult =
  { kind: "ok"; activation: Activation } | { kind: "already-active" };

// Only one scenario can be active at a time, so any activation is refused
// while another is active.
export function activateScenario(
  scenario: Scenario,
  actor: string,
): ActivationResult {
  const { scenarioId } = scenario;
  if (activations.some((a) => a.status === "ACTIVE")) {
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
