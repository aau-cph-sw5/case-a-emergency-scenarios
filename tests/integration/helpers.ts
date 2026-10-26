import { getDatabase, type Db } from "../../src/db/client.js";
import type { NewIncidentEvent } from "../../src/services/incident-log-service.js";

class Rollback extends Error {}

// Runs the test in a transaction that is always rolled back, so it leaves no
// rows behind. The incident log is append-only, so a committed test event could
// never be removed again.
export async function inRolledBackTransaction(run: (tx: Db) => Promise<void>) {
  try {
    await getDatabase().begin(async (tx) => {
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
