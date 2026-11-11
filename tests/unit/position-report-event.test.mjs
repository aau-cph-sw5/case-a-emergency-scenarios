import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../../src/validation/contract-validator.ts";

// The position report events agreed for MET-A-015 (#263), contract 6.6.0.
const report = {
  activationId: 1,
  staff: "",
  station: "Station B",
  reportedAt: "2026-11-05T12:00:00Z",
};
const check = (body) => validate(body, "position-report.schema.json");

test("a report without event is still valid, meaning on the way", () => {
  assert.deepEqual(check(report), []);
});

test("accepts each agreed event", () => {
  for (const event of ["EN_ROUTE", "ARRIVED", "CANCELLED", "CHECKED_OUT"]) {
    assert.deepEqual(check({ ...report, event }), [], event);
  }
});

test("rejects an event that is not agreed", () => {
  assert.notDeepEqual(check({ ...report, event: "LEFT" }), []);
});

test("rejects event and taskDone sent together", () => {
  assert.notDeepEqual(
    check({ ...report, event: "ARRIVED", taskDone: true }),
    [],
  );
  assert.deepEqual(check({ ...report, taskDone: true }), []);
});
