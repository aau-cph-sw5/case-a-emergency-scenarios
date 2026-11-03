import test from "node:test";
import assert from "node:assert/strict";
import { applyPositionReport } from "../../src/services/deployment-status.ts";

const free = (station) => ({
  status: "UNMANNED",
  staff: null,
  reportedAt: null,
  arrivedAt: null,
  fulfills: station,
});
const start = [free("A"), free("B")];

test("a report takes a free deployment as on the way", () => {
  const [a] = applyPositionReport(start, "7", "A", "PENDING", "t1");
  assert.deepEqual(a, {
    status: "PENDING",
    staff: "7",
    fulfills: "A",
    reportedAt: "t1",
    arrivedAt: null,
  });
});

test("arriving and finishing keep the arrival time", () => {
  const onTheWay = applyPositionReport(start, "7", "A", "PENDING", "t1");
  const arrived = applyPositionReport(onTheWay, "7", "A", "MANNED", "t2");
  const done = applyPositionReport(arrived, "7", "A", "TASK_DONE", "t3");
  assert.equal(arrived[0].status, "MANNED");
  assert.equal(arrived[0].arrivedAt, "t2");
  assert.equal(done[0].status, "TASK_DONE");
  assert.equal(done[0].arrivedAt, "t2");
});

test("reporting the same station again does not go back", () => {
  const arrived = applyPositionReport(start, "7", "A", "MANNED", "t1");
  const again = applyPositionReport(arrived, "7", "A", "PENDING", "t2");
  assert.equal(again[0].status, "MANNED");
  assert.equal(again[0].reportedAt, "t2");
});

test("moving to another station frees the old one", () => {
  const atA = applyPositionReport(start, "7", "A", "MANNED", "t1");
  const atB = applyPositionReport(atA, "7", "B", "PENDING", "t2");
  assert.deepEqual(atB[0], free("A"));
  assert.equal(atB[1].staff, "7");
  assert.equal(atB[1].status, "PENDING");
});

test("a second steward gets an extra deployment, removed when they leave", () => {
  const first = applyPositionReport(start, "7", "A", "MANNED", "t1");
  const second = applyPositionReport(first, "8", "A", "PENDING", "t2");
  assert.equal(second.length, 3);
  assert.equal(second[2].staff, "8");

  const left = applyPositionReport(second, "8", "B", "PENDING", "t3");
  assert.equal(left.filter((d) => d.fulfills === "A").length, 1);
  assert.equal(left[0].staff, "7");
});
