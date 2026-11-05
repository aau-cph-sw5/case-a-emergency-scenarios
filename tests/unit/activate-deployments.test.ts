import { test } from "node:test";
import assert from "node:assert/strict";
import { activateScenario } from "../../src/repositories/fixture-repository.js";
import type { Scenario } from "../../shared/types/v1/scenario.js";

test("a station gets one deployment per required steward", () => {
  const scenario = {
    scenarioId: "STAFF-2",
    currentVersion: "1",
    versions: [
      {
        version: "1",
        stationRequirements: [
          { station: "Forum", minimumStaffing: 2 },
          { station: "Flintholm", minimumStaffing: 0 },
        ],
      },
    ],
  } as unknown as Scenario;
  const result = activateScenario(scenario, "operator");
  assert.equal(result.kind, "ok");
  assert.deepEqual(
    result.kind === "ok" &&
      result.activation.deployments.map((d) => d.fulfills),
    ["Forum", "Forum", "Flintholm"],
  );
});
