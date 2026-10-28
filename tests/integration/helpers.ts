import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";
import postgres from "postgres";
import { seedScenarios, type Scenario } from "../../scripts/seed-scenarios.js";
import { getDatabase, type Db } from "../../src/db/client.js";
import type { NewIncidentEvent } from "../../src/services/incident-log-service.js";

class Rollback extends Error {}

let owner: postgres.Sql | undefined;

// A connection as the table owner, the user Flyway migrates as. The application
// connects as metro_app, which may not delete users or position reports, so a
// test that cleans up after itself does it through this one. Close it with
// closeOwnerDatabase() in after().
export function getOwnerDatabase(): postgres.Sql {
  const url = process.env.OWNER_DATABASE_URL;
  if (!url) {
    throw new Error(
      "OWNER_DATABASE_URL is set by tests/integration/setup-env.ts",
    );
  }
  // The same column naming as getDatabase(), so a test reads rows the same way.
  owner ??= postgres(url, {
    transform: { column: { from: postgres.toCamel, to: postgres.fromCamel } },
  });
  return owner;
}

export async function closeOwnerDatabase() {
  await owner?.end();
  owner = undefined;
}

const SCENARIO_FIXTURES = new URL(
  "../../fixtures/v1/scenarios/",
  import.meta.url,
);

// Synthetic stations for the DEMO fixtures.
const TEST_STATIONS = ["A", "B", "C", "D", "E", "F", "G"].map((letter) => ({
  code: `Station ${letter}`,
  name: `Station ${letter}`,
}));

// Loads the synthetic DEMO scenarios from fixtures/v1/scenarios/ into the test database
export async function seedTestScenarios() {
  const scenarios = readdirSync(SCENARIO_FIXTURES)
    .filter((file) => file.endsWith(".json"))
    .map(
      (file) =>
        JSON.parse(
          readFileSync(new URL(file, SCENARIO_FIXTURES), "utf8"),
        ) as Scenario,
    );

  const client = new pg.Client({
    connectionString: process.env.OWNER_DATABASE_URL,
  });
  await client.connect();
  try {
    await seedScenarios(client, scenarios, TEST_STATIONS);
  } finally {
    await client.end();
  }
}

// Runs the test in a transaction that is always rolled back, so it leaves no
// rows behind. The incident log is append-only, so a committed test event could
// never be removed again. Runs as the application's role unless `connection` says
// otherwise.
export async function inRolledBackTransaction(
  run: (tx: Db) => Promise<void>,
  connection: postgres.Sql = getDatabase(),
) {
  try {
    await connection.begin(async (tx) => {
      await run(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

export function anEvent(
  overrides: Partial<NewIncidentEvent> = {},
): NewIncidentEvent {
  return {
    type: "SCENARIO_ACTIVATED",
    schemaVersion: 1,
    subject: { type: "activation", id: "ACT-TEST-1" },
    activationId: "ACT-TEST-1",
    line: "M1",
    payload: { scenarioId: "DEMO-001", some_key: 1 },
    ...overrides,
  };
}
