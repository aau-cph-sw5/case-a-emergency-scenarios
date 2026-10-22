import { test } from "node:test";
import assert from "node:assert/strict";
import { findOwnAssignment } from "../../mobile/src/screens/own-assignment.ts";

const deployments = [
  { status: "MANNED", staff: "steward-other", fulfills: "FOR" },
  { status: "PENDING", staff: "steward-test", fulfills: "KN" },
  { status: "UNMANNED", staff: null, fulfills: "KGN" },
];

test("finds the deployment whose staff is the logged-in user", () => {
  assert.deepEqual(findOwnAssignment(deployments, "steward-test"), {
    status: "PENDING",
    staff: "steward-test",
    fulfills: "KN",
  });
});

test("returns undefined when the steward has no deployment", () => {
  assert.equal(findOwnAssignment(deployments, "steward-unassigned"), undefined);
});

test("returns undefined without a user id, even if a deployment has no staff", () => {
  assert.equal(findOwnAssignment(deployments, null), undefined);
  assert.equal(findOwnAssignment(deployments, undefined), undefined);
  assert.equal(findOwnAssignment(deployments, ""), undefined);
});

test("returns undefined when there are no deployments", () => {
  assert.equal(findOwnAssignment([], "steward-test"), undefined);
});
