import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSaltRounds } from "../../scripts/seed-test-users.js";

test("resolveSaltRounds defaults to 10 when unset or blank", () => {
  assert.equal(resolveSaltRounds(undefined), 10);
  assert.equal(resolveSaltRounds(""), 10);
  assert.equal(resolveSaltRounds("   "), 10);
});

test("resolveSaltRounds accepts integers from 4 through 10", () => {
  assert.equal(resolveSaltRounds("4"), 4);
  assert.equal(resolveSaltRounds(" 6 "), 6);
  assert.equal(resolveSaltRounds("10"), 10);
});

test("resolveSaltRounds rejects out-of-range and non-integer values", () => {
  for (const invalid of ["3", "11", "-1", "0", "4.5", "abc", "4px"]) {
    assert.throws(
      () => resolveSaltRounds(invalid),
      /TEST_BCRYPT_ROUNDS must be/,
      `expected ${invalid} to throw`,
    );
  }
});
