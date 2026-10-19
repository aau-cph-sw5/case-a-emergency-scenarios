import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isScenarioState } from "../../web/src/scenario-state.ts";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../fixtures/v1/scenario-state.json", import.meta.url),
  ),
);

test("accepts the stub's scenario state", () => {
  assert.equal(isScenarioState(fixture), true);
});

test("rejects a state with a missing field or unknown status", () => {
  assert.equal(isScenarioState({ ...fixture, actor: undefined }), false);
  assert.equal(isScenarioState({ ...fixture, status: "PAUSED" }), false);
});

test("rejects anything that is not an object", () => {
  assert.equal(isScenarioState(null), false);
  assert.equal(isScenarioState([]), false);
});
