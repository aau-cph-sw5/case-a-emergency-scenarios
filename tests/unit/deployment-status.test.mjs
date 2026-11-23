import test from "node:test";
import assert from "node:assert/strict";
import { deploymentsFromReports } from "../../src/repositories/deployment-status.ts";

const free = (station) => ({
  status: "UNMANNED",
  staff: null,
  reportedAt: null,
  arrivedAt: null,
  fulfills: station,
});
const required = [free("A"), free("B")];
const report = (staff, station, step, reportedAt) => ({
  staff,
  station,
  step,
  reportedAt,
});
const at = (deployments, station) =>
  deployments.filter((d) => d.fulfills === station);

test("no reports leaves every deployment free", () => {
  assert.deepEqual(deploymentsFromReports(required, []), required);
});

test("on the way, arrived, task done and checked out keep the arrival time", () => {
  const steps = [
    report("7", "A", "EN_ROUTE", "t1"),
    report("7", "A", "ARRIVED", "t2"),
    report("7", "A", "TASK_DONE", "t3"),
    report("7", "A", "CHECKED_OUT", "t4"),
  ];
  const expected = [
    ["PENDING", null],
    ["MANNED", "t2"],
    ["TASK_DONE", "t2"],
    ["CHECKED_OUT", "t2"],
  ];
  steps.forEach((_, i) => {
    const [a] = deploymentsFromReports(required, steps.slice(0, i + 1));
    assert.deepEqual(a, {
      status: expected[i][0],
      staff: "7",
      fulfills: "A",
      reportedAt: steps[i].reportedAt,
      arrivedAt: expected[i][1],
    });
  });
});

test("cancelling frees the station", () => {
  const deployments = deploymentsFromReports(required, [
    report("7", "A", "EN_ROUTE", "t1"),
    report("7", "A", "CANCELLED", "t2"),
  ]);
  assert.deepEqual(deployments, required);
});

test("on the way to another station frees the old one", () => {
  const deployments = deploymentsFromReports(required, [
    report("7", "A", "EN_ROUTE", "t1"),
    report("7", "B", "EN_ROUTE", "t2"),
  ]);
  assert.deepEqual(at(deployments, "A"), [free("A")]);
  assert.equal(at(deployments, "B")[0].status, "PENDING");
});

test("a checked-out deployment keeps its staff after the steward moves on", () => {
  const deployments = deploymentsFromReports(required, [
    report("7", "A", "EN_ROUTE", "t1"),
    report("7", "A", "ARRIVED", "t2"),
    report("7", "A", "CHECKED_OUT", "t3"),
    report("7", "B", "EN_ROUTE", "t4"),
  ]);
  assert.equal(at(deployments, "A")[0].status, "CHECKED_OUT");
  assert.equal(at(deployments, "A")[0].staff, "7");
  assert.equal(at(deployments, "B")[0].staff, "7");
});

test("checking out at a new station frees the steward's older checkout", () => {
  const deployments = deploymentsFromReports(required, [
    report("7", "A", "EN_ROUTE", "t1"),
    report("7", "A", "ARRIVED", "t2"),
    report("7", "A", "CHECKED_OUT", "t3"),
    report("7", "B", "EN_ROUTE", "t4"),
    report("7", "B", "ARRIVED", "t5"),
    report("7", "B", "CHECKED_OUT", "t6"),
  ]);
  assert.deepEqual(at(deployments, "A"), [free("A")]);
  assert.deepEqual(
    at(deployments, "B").map((d) => [d.status, d.staff]),
    [["CHECKED_OUT", "7"]],
  );
});

test("a new steward takes over a checked-out deployment", () => {
  const deployments = deploymentsFromReports(required, [
    report("7", "A", "ARRIVED", "t1"),
    report("7", "A", "CHECKED_OUT", "t2"),
    report("8", "A", "EN_ROUTE", "t3"),
  ]);
  assert.deepEqual(
    at(deployments, "A").map((d) => [d.status, d.staff]),
    [["PENDING", "8"]],
  );
});

test("an extra steward gets an extra deployment that goes when they leave", () => {
  const two = deploymentsFromReports(required, [
    report("7", "A", "EN_ROUTE", "t1"),
    report("8", "A", "EN_ROUTE", "t2"),
  ]);
  assert.equal(at(two, "A").length, 2);

  const left = deploymentsFromReports(required, [
    report("7", "A", "EN_ROUTE", "t1"),
    report("8", "A", "EN_ROUTE", "t2"),
    report("8", "A", "CANCELLED", "t3"),
  ]);
  assert.deepEqual(
    at(left, "A").map((d) => d.staff),
    ["7"],
  );
});

test("a station that requires two keeps both slots when one steward leaves", () => {
  const deployments = deploymentsFromReports(
    [free("A"), free("A")],
    [report("7", "A", "EN_ROUTE", "t1"), report("7", "A", "CANCELLED", "t2")],
  );
  assert.deepEqual(deployments, [free("A"), free("A")]);
});

test("on the way again while arrived keeps the arrival", () => {
  const [a] = deploymentsFromReports(required, [
    report("7", "A", "ARRIVED", "t1"),
    report("7", "A", "EN_ROUTE", "t2"),
  ]);
  assert.equal(a.status, "MANNED");
});

test("a report for a station outside the activation is ignored", () => {
  assert.deepEqual(
    deploymentsFromReports(required, [report("7", "Z", "EN_ROUTE", "t1")]),
    required,
  );
});
