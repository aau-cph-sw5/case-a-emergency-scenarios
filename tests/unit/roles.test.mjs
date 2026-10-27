import assert from "node:assert/strict";
import test from "node:test";
import { ROLES, isRole } from "../../shared/auth/roles.ts";

test("defines the supported account roles", () => {
  assert.deepEqual(ROLES, ["STEWARD", "OPERATOR"]);
});

test("recognises only supported account roles", () => {
  assert.equal(isRole("STEWARD"), true);
  assert.equal(isRole("OPERATOR"), true);
  assert.equal(isRole("ADMIN"), false);
  assert.equal(isRole(1), false);
  assert.equal(isRole(null), false);
});
