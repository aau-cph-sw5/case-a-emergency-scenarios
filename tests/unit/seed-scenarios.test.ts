import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSeedJson,
  validate,
  type Scenario,
} from "../../scripts/seed-scenarios.ts";

const STATIONS = ["VAN", "FL", "LIT", "KN"];
const SHAFTS = ["ØSØ", "GÅB"];
const allowedStations = new Set([...STATIONS, ...SHAFTS]);
const shaftCodes = new Set(SHAFTS);

function scenarioWithRoute(route: object[]): Scenario {
  return {
    scenarioId: "TEST-1",
    lineGroup: "M3_M4",
    name: "Test",
    currentVersion: "1.0",
    covers: [{ trackNumber: 1, stationA: "VAN", stationB: "FL" }],
    versions: [
      {
        version: "1.0",
        revision: "test",
        operatingPlan: {
          name: "plan",
          patterns: [
            {
              operationType: "PENDULUM",
              routeCode: "R",
              trackNumber: 1,
              maximumTrains: 1,
              did: "D",
              route:
                route as Scenario["versions"][0]["operatingPlan"]["patterns"][0]["route"],
            },
          ],
        },
      },
    ],
  };
}

function errorsFor(route: object[]) {
  return validate(
    scenarioWithRoute(route),
    "test.json",
    allowedStations,
    shaftCodes,
  );
}

test("a route of only stations is valid", () => {
  assert.deepEqual(
    errorsFor([
      { sequence: 1, station: "VAN" },
      { sequence: 2, station: "FL" },
    ]),
    [],
  );
});

test("a shaft in the middle of a route is valid", () => {
  assert.deepEqual(
    errorsFor([
      { sequence: 1, station: "VAN" },
      { sequence: 2, shafts: "ØSØ" },
      { sequence: 3, station: "FL" },
    ]),
    [],
  );
});

const DECOMPOSED_GAB = "GÅB".normalize("NFD");

test("decomposed codes are normalised when a seed file is parsed", () => {
  assert.notEqual(DECOMPOSED_GAB, "GÅB");
  const parsed = parseSeedJson<{ shafts: string }>(
    JSON.stringify({ shafts: DECOMPOSED_GAB }),
  );
  assert.equal(parsed.shafts, "GÅB");
});

test("a decomposed shaft code in a route is valid after parsing", () => {
  const scenario = parseSeedJson<Scenario>(
    JSON.stringify(
      scenarioWithRoute([
        { sequence: 1, station: "VAN" },
        { sequence: 2, shafts: DECOMPOSED_GAB },
      ]),
    ),
  );
  assert.deepEqual(
    validate(scenario, "test.json", allowedStations, shaftCodes),
    [],
  );
});

test("a stop with neither station nor shaft is rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, intersec: "ØSØ" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /route\[1\]/);
  assert.match(errors[0], /intersec/); // the stop itself is printed
});

test("a stop with both station and shaft is rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, station: "FL", shafts: "ØSØ" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /route\[1\]/);
});

test("a station code written as a shaft is rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, shafts: "KN" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown shaft/);
});

test("an unknown station is still rejected", () => {
  const errors = errorsFor([
    { sequence: 1, station: "VAN" },
    { sequence: 2, station: "NOPE" },
  ]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /unknown station "NOPE"/);
});
