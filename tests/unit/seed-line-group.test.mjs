import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../../scripts/seed-scenarios.ts";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../fixtures/v1/scenarios/DEMO-001.json", import.meta.url),
  ),
);
const stations = new Set(
  ["A", "B", "C", "D", "E", "F", "G"].map((letter) => `Station ${letter}`),
);
const fileName = "SeedDataScenario_test.json";

test("accepts each valid scenario line group", () => {
  for (const lineGroup of ["M1_M2", "M3_M4"]) {
    assert.deepEqual(
      validate({ ...fixture, lineGroup }, fileName, stations),
      [],
    );
  }
});

test("rejects a missing or invalid line group with the filename", () => {
  for (const lineGroup of [undefined, "M1", "m1_m2", ""]) {
    const errors = validate({ ...fixture, lineGroup }, fileName, stations);
    assert.ok(
      errors.some(
        (error) => error.includes(fileName) && error.includes("lineGroup"),
      ),
      `Expected a lineGroup error for ${String(lineGroup)}; got ${JSON.stringify(errors)}`,
    );
  }
});

test("validates a scenario's line group even when it has no patterns", () => {
  const scenario = structuredClone(fixture);
  delete scenario.lineGroup;
  for (const version of scenario.versions) version.operatingPlan.patterns = [];
  const errors = validate(scenario, fileName, stations);
  assert.ok(errors.some((error) => error.includes("lineGroup")));
});
