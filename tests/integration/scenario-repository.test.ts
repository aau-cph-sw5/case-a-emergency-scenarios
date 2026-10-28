import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { getDatabase } from "../../src/db/client.js";
import {
  findScenario,
  getAllScenarios,
} from "../../src/repositories/scenario-repository.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestScenarios } from "./helpers.js";

// Seed the syntethic DEMO fixtures into the database
// Then test if they are read correctly from the database using the scenario-repository functions.
before(async () => {
  await seedTestScenarios();
});

after(async () => {
  await getDatabase().end();
});

test("getAllScenarios returns every scenario in the scenario-list shape", async () => {
  const scenarios = await getAllScenarios();

  assert.deepEqual(validate(scenarios, "scenario-list.schema.json"), []);
  assert.deepEqual(scenarios.map((scenario) => scenario.scenarioId).sort(), [
    "DEMO-001",
    "DEMO-002",
    "DEMO-003",
  ]);

  const demo2 = scenarios.find(
    (scenario) => scenario.scenarioId === "DEMO-002",
  );
  assert.equal(demo2?.currentVersion, "2");
  assert.deepEqual(demo2?.covers, [
    { trackNumber: 2, stationA: "Station F", stationB: "Station G" },
  ]);
});

test("findScenario rebuilds the current version with its requirements", async () => {
  const scenario = await findScenario("DEMO-002");

  assert.ok(scenario);
  assert.deepEqual(validate(scenario, "scenario.schema.json"), []);
  assert.equal(scenario.name, "Synthetic fallback scenario 2");
  assert.equal(scenario.currentVersion, "2");

  const [version] = scenario.versions;
  assert.equal(scenario.versions.length, 1);
  assert.equal(version.version, "2");
  assert.equal(version.revision, "Changed instructions");
  assert.equal(version.operatingPlan.name, "Fallback operation");
  assert.equal(version.operatingPlan.patterns[0].routeCode, "F-G");
  assert.equal(
    version.operatingPlan.patterns[0].description,
    "Synthetic pendulum service",
  );

  assert.deepEqual(
    version.stationRequirements.map(
      ({ station, placement, minimumStaffing, activeDuring, actions }) => ({
        station,
        placement,
        minimumStaffing,
        activeDuring,
        actions,
      }),
    ),
    [
      {
        station: "Station G",
        placement: "Streetlevel, near the escalators",
        minimumStaffing: 1,
        activeDuring: [
          { dayPattern: "MON-THU", startTime: "07:00", endTime: "09:00" },
        ],
        actions: [
          { sequence: 1, instruction: "Synthetic example instruction" },
        ],
      },
    ],
  );
});

test("findScenario returns undefined for an unknown id", async () => {
  assert.equal(await findScenario("unknown"), undefined);
});
