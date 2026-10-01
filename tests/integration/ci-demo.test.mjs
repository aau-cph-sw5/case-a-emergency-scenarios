import test from "node:test";
import assert from "node:assert/strict";

test("ci demo: a failing test turns the check red", () => {
  assert.equal(1, 2);
});
