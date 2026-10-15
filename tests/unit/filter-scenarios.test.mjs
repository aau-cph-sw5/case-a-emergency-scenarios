import { test } from "node:test";
import assert from "node:assert/strict";
import { filterScenarios } from "../../web/src/filter-scenarios.ts";

const scenarios = [
  { scenarioId: "DEMO-001", name: "Synthetic fallback scenario" },
  { scenarioId: "DEMO-002", name: "Synthetic partial closure" },
];

test("keeps only scenarios whose name contains the query", () => {
  assert.deepEqual(filterScenarios(scenarios, "closure"), [scenarios[1]]);
});

test("ignores case and surrounding spaces", () => {
  assert.deepEqual(filterScenarios(scenarios, "  FALLBACK "), [scenarios[0]]);
});

test("returns an empty list when nothing matches", () => {
  assert.deepEqual(filterScenarios(scenarios, "flood"), []);
});

test("returns every scenario for an empty or blank query", () => {
  assert.deepEqual(filterScenarios(scenarios, ""), scenarios);
  assert.deepEqual(filterScenarios(scenarios, "   "), scenarios);
});
