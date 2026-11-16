import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";
import { seedScenarios, type Scenario } from "../../scripts/seed-scenarios.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { seedTestScenarios } from "./helpers.js";

test("reseeding updates scenario content without breaking activation references", async () => {
  await seedTestUsers("seed-activation-");
  await seedTestScenarios();

  const scenario = JSON.parse(
    readFileSync(
      new URL("../../fixtures/v1/scenarios/DEMO-001.json", import.meta.url),
      "utf8",
    ),
  ) as Scenario;
  const stations = ["A", "B", "C", "D", "E", "F", "G"].map((letter) => ({
    code: `Station ${letter}`,
    name: `Station ${letter}`,
  }));
  const client = new pg.Client({
    connectionString: process.env.OWNER_DATABASE_URL,
  });
  await client.connect();
  let activationId: number | undefined;
  let extraVersionId: number | undefined;
  try {
    const extraVersion = await client.query(
      `INSERT INTO scenario_versions (scenario_id, version, revision)
       VALUES ($1, $2, $3) RETURNING id`,
      [scenario.scenarioId, "not-in-seed", "Created separately"],
    );
    extraVersionId = extraVersion.rows[0].id;
    const activation = await client.query(
      `INSERT INTO incident_activations (scenario_version_id, scenario_id, line_group, activated_by)
       SELECT current_version_id, scenario_id, line_group,
         (SELECT id FROM users WHERE username = 'seed-activation-operator')
       FROM scenarios WHERE scenario_id = $1
       RETURNING id, scenario_version_id`,
      [scenario.scenarioId],
    );
    activationId = activation.rows[0].id;
    const versionId = activation.rows[0].scenario_version_id;
    scenario.name = "Updated scenario";
    scenario.versions[0].operatingPlan.name = "Updated operating plan";

    await seedScenarios(client, [scenario], stations);
    await seedScenarios(client, [scenario], stations);

    const result = await client.query(
      `SELECT s.name, s.current_version_id, a.scenario_version_id, v.operating_plan_name AS plan_name,
         (SELECT count(*)::int FROM scenario_versions WHERE scenario_id = s.scenario_id) AS version_count
       FROM scenarios s
       JOIN incident_activations a ON a.scenario_id = s.scenario_id
       JOIN scenario_versions v ON v.id = a.scenario_version_id
       WHERE a.id = $1`,
      [activationId],
    );
    assert.equal(result.rows[0].name, "Updated scenario");
    assert.equal(result.rows[0].plan_name, "Updated operating plan");
    assert.equal(result.rows[0].scenario_version_id, versionId);
    assert.equal(result.rows[0].current_version_id, versionId);
    assert.equal(result.rows[0].version_count, scenario.versions.length + 1);
    const extra = await client.query(
      "SELECT revision FROM scenario_versions WHERE id = $1",
      [extraVersionId],
    );
    assert.equal(extra.rows[0].revision, "Created separately");
  } finally {
    if (activationId !== undefined) {
      await client.query("DELETE FROM incident_activations WHERE id = $1", [
        activationId,
      ]);
    }
    if (extraVersionId !== undefined) {
      await client.query("DELETE FROM scenario_versions WHERE id = $1", [
        extraVersionId,
      ]);
    }
    await client.end();
    await seedTestScenarios();
  }
});
