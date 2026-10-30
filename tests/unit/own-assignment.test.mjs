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

// Since #193 the userId is a numeric database id, while staff is text.
test("matches a numeric user id against staff written as text", () => {
  const withNumericIds = [
    { status: "MANNED", staff: "2", fulfills: "FOR" },
    { status: "PENDING", staff: "1", fulfills: "KN" },
  ];
  assert.equal(findOwnAssignment(withNumericIds, 1)?.fulfills, "KN");
});

test("matches when staff arrives as a number", () => {
  const withNumberStaff = [{ status: "PENDING", staff: 1, fulfills: "KN" }];
  assert.equal(findOwnAssignment(withNumberStaff, "1")?.fulfills, "KN");
  assert.equal(findOwnAssignment(withNumberStaff, 2), undefined);
});

test("does not match 0 against a deployment without staff", () => {
  const unmanned = [{ status: "UNMANNED", staff: null, fulfills: "KGN" }];
  assert.equal(findOwnAssignment(unmanned, 0), undefined);
});
