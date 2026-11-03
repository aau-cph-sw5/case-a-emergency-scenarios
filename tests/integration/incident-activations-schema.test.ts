import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { getDatabase, type Db } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { inRolledBackTransaction, seedTestScenarios } from "./helpers.js";

const sql = getDatabase();

before(async () => {
  await seedTestUsers("activation-schema-");
  await seedTestScenarios();
});

after(() => sql.end());

function activate(tx: Db, scenarioId: string, lineGroup: string) {
  return tx`
    INSERT INTO incident_activations
      (scenario_version_id, scenario_id, line_group, activated_by)
    SELECT current_version_id, scenario_id, ${lineGroup},
      (SELECT id FROM users WHERE username = 'activation-schema-operator')
    FROM scenarios WHERE scenario_id = ${scenarioId}
    RETURNING id
  `;
}

test("both line groups can have an active incident", () =>
  inRolledBackTransaction(async (tx) => {
    assert.equal((await activate(tx, "DEMO-001", "M1_M2")).length, 1);
    assert.equal((await activate(tx, "DEMO-002", "M3_M4")).length, 1);
  }));

test("a second active incident in the same group is rejected", () =>
  inRolledBackTransaction(async (tx) => {
    await activate(tx, "DEMO-001", "M1_M2");
    await assert.rejects(activate(tx, "DEMO-003", "M1_M2"), { code: "23505" });
  }));

test("closing an incident allows another in its group", () =>
  inRolledBackTransaction(async (tx) => {
    const [active] = await activate(tx, "DEMO-001", "M1_M2");
    await tx`UPDATE incident_activations SET deactivated_at = now() WHERE id = ${active.id}`;
    assert.equal((await activate(tx, "DEMO-003", "M1_M2")).length, 1);
  }));

test("an incident cannot close before it was activated", () =>
  inRolledBackTransaction(async (tx) => {
    const [active] = await activate(tx, "DEMO-001", "M1_M2");
    await assert.rejects(
      tx`UPDATE incident_activations SET deactivated_at = activated_at - interval '1 second' WHERE id = ${active.id}`,
      { code: "23514" },
    );
  }));

test("an activation cannot use a different scenario's line group", () =>
  inRolledBackTransaction(async (tx) => {
    await assert.rejects(activate(tx, "DEMO-001", "M3_M4"), { code: "23503" });
  }));

test("an activation cannot use a different scenario's version", () =>
  inRolledBackTransaction(async (tx) => {
    await assert.rejects(
      tx`
        INSERT INTO incident_activations
          (scenario_version_id, scenario_id, line_group, activated_by)
        SELECT (SELECT current_version_id FROM scenarios WHERE scenario_id = 'DEMO-002'),
          'DEMO-001', 'M1_M2',
          (SELECT id FROM users WHERE username = 'activation-schema-operator')
      `,
      { code: "23503" },
    );
  }));
