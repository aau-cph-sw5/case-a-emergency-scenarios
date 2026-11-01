import { test } from "node:test";
import assert from "node:assert/strict";
import { canActivate, keepSelection } from "../../web/src/selection.ts";

const scenarios = [
  { scenarioId: "DEMO-001", name: "Synthetic fallback scenario" },
  { scenarioId: "DEMO-002", name: "Synthetic partial closure" },
];
const noneActive = new Set();

test("keeps the selection while the scenario is in the list", () => {
  assert.equal(keepSelection("DEMO-002", scenarios), "DEMO-002");
});

test("clears the selection when the scenario is no longer in the list", () => {
  assert.equal(keepSelection("DEMO-003", scenarios), null);
});

test("stays empty when nothing is selected", () => {
  assert.equal(keepSelection(null, scenarios), null);
});

test("the activate button is disabled when nothing is selected", () => {
  assert.equal(canActivate(null, false, noneActive), false);
});

test("the activate button is disabled while an activation is in progress", () => {
  assert.equal(canActivate("DEMO-002", true, noneActive), false);
});

test("the activate button is disabled when the selected scenario is already active", () => {
  assert.equal(canActivate("DEMO-001", false, new Set(["DEMO-001"])), false);
});

test("the activate button is enabled for a selected scenario that is not active", () => {
  assert.equal(canActivate("DEMO-002", false, new Set(["DEMO-001"])), true);
});
