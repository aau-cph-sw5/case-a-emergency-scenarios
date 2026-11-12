import assert from "node:assert/strict";
import test from "node:test";
import { ROLES, isRole } from "../../shared/auth/roles.ts";
import { isRoleAllowedForClient } from "../../shared/auth/client-access.ts";

test("defines the supported account roles", () => {
  assert.deepEqual(ROLES, ["STEWARD", "OPERATOR", "ADMIN"]);
});

test("recognises only supported account roles", () => {
  assert.equal(isRole("STEWARD"), true);
  assert.equal(isRole("OPERATOR"), true);
  assert.equal(isRole("ADMIN"), true);
  assert.equal(isRole("UNKNOWN"), false);
  assert.equal(isRole(1), false);
  assert.equal(isRole(null), false);
});

test("client access preserves existing roles and permits admin on web", () => {
  assert.equal(isRoleAllowedForClient("web", "OPERATOR"), true);
  assert.equal(isRoleAllowedForClient("web", "STEWARD"), false);
  assert.equal(isRoleAllowedForClient("web", "ADMIN"), true);
  assert.equal(isRoleAllowedForClient("mobile", "STEWARD"), true);
  assert.equal(isRoleAllowedForClient("mobile", "OPERATOR"), false);
  assert.equal(isRoleAllowedForClient("mobile", "ADMIN"), false);
});
