import assert from "node:assert/strict";
import test from "node:test";
import {
  LINE_GROUPS,
  LINE_GROUP_LABELS,
  isLineGroup,
  lineGroupFromLabel,
} from "../../shared/auth/line-groups.ts";

test("defines the line groups and how operators label them", () => {
  assert.deepEqual(LINE_GROUPS, ["M1_M2", "M3_M4"]);
  assert.deepEqual(LINE_GROUP_LABELS, { M1_M2: "M1/M2", M3_M4: "M3/M4" });
});

test("turns an operator label back into its line group", () => {
  assert.equal(lineGroupFromLabel("M1/M2"), "M1_M2");
  assert.equal(lineGroupFromLabel("M3/M4"), "M3_M4");
});

test("recognises only supported line groups", () => {
  assert.equal(isLineGroup("M1_M2"), true);
  assert.equal(isLineGroup("M3_M4"), true);
  assert.equal(isLineGroup("M1/M2"), false);
  assert.equal(isLineGroup("M5"), false);
  assert.equal(isLineGroup(1), false);
  assert.equal(isLineGroup(null), false);
});
