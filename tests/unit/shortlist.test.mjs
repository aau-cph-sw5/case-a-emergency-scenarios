import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CANDIDATES,
  shortlist,
} from "../../src/services/scenario-suggestion/shortlist.ts";

const ranked = [
  { scenarioId: "DEMO-A", score: 0.9 },
  { scenarioId: "DEMO-B", score: 0.8 },
  { scenarioId: "DEMO-C", score: 0.7 },
  { scenarioId: "DEMO-D", score: 0.6 },
  { scenarioId: "DEMO-E", score: 0.5 },
  { scenarioId: "DEMO-F", score: 0.4 },
  { scenarioId: "DEMO-G", score: 0.3 },
];

test("keeps at most five candidates", () => {
  assert.equal(MAX_CANDIDATES, 5);
  assert.equal(shortlist(ranked).length, 5);
});

test("keeps the best candidates in their ranked order", () => {
  assert.deepEqual(shortlist(ranked), ranked.slice(0, 5));
});

test("keeps every candidate when there are fewer than five", () => {
  assert.deepEqual(shortlist(ranked.slice(0, 3)), ranked.slice(0, 3));
  assert.deepEqual(shortlist([]), []);
});

test("does not change the ranked list it is given", () => {
  const copy = [...ranked];

  shortlist(ranked);

  assert.deepEqual(ranked, copy);
});
