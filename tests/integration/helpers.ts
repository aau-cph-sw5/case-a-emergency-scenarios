import postgres from "postgres";
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
