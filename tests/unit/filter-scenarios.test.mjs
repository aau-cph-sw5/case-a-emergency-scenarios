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

test("finds a scenario by a station it covers", () => {
  const withCovers = [
    {
      name: "Scenarie 1",
      covers: [{ trackNumber: 1, stationA: "forum", stationB: "nørreport" }],
    },
    { name: "Scenarie 2" },
  ];
  assert.deepEqual(filterScenarios(withCovers, "Nørreport"), [withCovers[0]]);
});

test("returns an empty list when nothing matches", () => {
  assert.deepEqual(filterScenarios(scenarios, "flood"), []);
});

test("returns every scenario for an empty or blank query", () => {
  assert.deepEqual(filterScenarios(scenarios, ""), scenarios);
  assert.deepEqual(filterScenarios(scenarios, "   "), scenarios);
});

test("sorts scenario numbers naturally, also while searching, without changing the source", () => {
  const unordered = [
    { name: "Scenarie 10" },
    { name: "Scenarie 2" },
    { name: "Scenarie 1" },
  ];
  const original = [...unordered];
  const expected = [unordered[2], unordered[1], unordered[0]];
  assert.deepEqual(filterScenarios(unordered, ""), expected);
  assert.deepEqual(filterScenarios(unordered, "scenarie"), expected);
  assert.deepEqual(unordered, original);
});
