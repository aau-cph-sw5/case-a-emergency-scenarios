import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyStatusChange } from "../../shared/scenario/steward-status.ts";
import { validate } from "../../stub-server/contract-validator.js";

const fixture = (name) =>
  JSON.parse(
    readFileSync(new URL(`../../fixtures/v1/${name}`, import.meta.url)),
  );

const at = (status, station = "Station B") => ({ status, station });

test("a steward without a status can only assign", () => {
  assert.equal(classifyStatusChange(null, at("ASSIGNED")), "CHANGE");
  assert.equal(classifyStatusChange(null, at("CHECKED_IN")), "INVALID");
  assert.equal(classifyStatusChange(null, at("CHECKED_OUT")), "INVALID");
});

test("assign, check in and check out follow each other at one station", () => {
  assert.equal(
    classifyStatusChange(at("ASSIGNED"), at("CHECKED_IN")),
    "CHANGE",
  );
  assert.equal(
    classifyStatusChange(at("CHECKED_IN"), at("CHECKED_OUT")),
    "CHANGE",
  );
});

test("an assigned steward may change station or cancel before arriving", () => {
  assert.equal(
    classifyStatusChange(at("ASSIGNED"), at("ASSIGNED", "Station C")),
    "CHANGE",
  );
  assert.equal(
    classifyStatusChange(at("ASSIGNED"), at("CHECKED_OUT")),
    "CHANGE",
  );
});

test("a checked-out steward may take a new station", () => {
  assert.equal(
    classifyStatusChange(at("CHECKED_OUT"), at("ASSIGNED", "Station C")),
    "CHANGE",
  );
});

test("the same status at the same station is a harmless repeat", () => {
  for (const status of ["ASSIGNED", "CHECKED_IN", "CHECKED_OUT"]) {
    assert.equal(classifyStatusChange(at(status), at(status)), "REPEAT");
  }
});

test("any other change is invalid", () => {
  const invalid = [
    [at("ASSIGNED"), at("CHECKED_IN", "Station C")],
    [at("ASSIGNED"), at("CHECKED_OUT", "Station C")],
    [at("CHECKED_IN"), at("ASSIGNED")],
    [at("CHECKED_IN"), at("ASSIGNED", "Station C")],
    [at("CHECKED_IN"), at("CHECKED_IN", "Station C")],
    [at("CHECKED_IN"), at("CHECKED_OUT", "Station C")],
    [at("CHECKED_OUT"), at("CHECKED_IN")],
    [at("CHECKED_OUT"), at("CHECKED_OUT", "Station C")],
  ];
  for (const [current, next] of invalid) {
    assert.equal(
      classifyStatusChange(current, next),
      "INVALID",
      `${current.status} at ${current.station} to ${next.status} at ${next.station}`,
    );
  }
});

test("the fixtures match the steward-status schemas", () => {
  assert.deepEqual(
    validate(fixture("steward-status.json"), ["steward-status.schema.json"]),
    [],
  );
  assert.deepEqual(
    validate(fixture("steward-statuses.json"), [
      "steward-status-list.schema.json",
    ]),
    [],
  );
});

test("the schemas refuse an unknown status and a text userId", () => {
  const status = fixture("steward-status.json");
  assert.notDeepEqual(
    validate({ ...status, status: "EN_ROUTE" }, ["steward-status.schema.json"]),
    [],
  );
  assert.notDeepEqual(
    validate({ ...status, userId: "steward-test" }, [
      "steward-status.schema.json",
    ]),
    [],
  );
  assert.notDeepEqual(
    validate({ status: "ASSIGNED" }, ["steward-status-request.schema.json"]),
    [],
  );
});
