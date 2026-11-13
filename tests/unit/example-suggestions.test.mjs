// TEMPORARY: remove with web/src/example-suggestions.tsx when #371 lands.
import test from "node:test";
import assert from "node:assert/strict";
import { exampleSuggestions } from "../../web/src/example-suggestions.tsx";

const scenarios = [
  {
    scenarioId: "A",
    name: "A",
    covers: [{ trackNumber: 1, stationA: "forum", stationB: "nørreport" }],
  },
  {
    scenarioId: "B",
    name: "B",
    covers: [
      { trackNumber: 1, stationA: "fasanvej", stationB: "forum" },
      { trackNumber: 1, stationA: "forum", stationB: "lindevang" },
    ],
  },
];

test("ranks scenarios by the share of their stations the text names", () => {
  assert.deepEqual(exampleSuggestions("togstop forum nørreport", scenarios), {
    status: "CONFIDENT",
    candidates: [
      { scenarioId: "A", score: 0.95 },
      { scenarioId: "B", score: 0.65 },
    ],
  });
});

test("no named station gives no confident candidate", () => {
  assert.deepEqual(exampleSuggestions("signalfejl", scenarios), {
    status: "NO_CONFIDENT_CANDIDATE",
  });
});
