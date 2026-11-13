import test from "node:test";
import assert from "node:assert/strict";
import {
  matchedStations,
  routeLabel,
} from "../../web/src/suggestion-reasons.tsx";

const covers = [
  { trackNumber: 1, stationA: "Forum", stationB: "Nørreport" },
  { trackNumber: 2, stationA: "Forum", stationB: "Nørreport" },
  { trackNumber: 1, stationA: "Fasanvej", stationB: "Forum" },
];

test("finds a station named in the description", () => {
  assert.deepEqual(matchedStations("signalfejl ved Forum", covers), ["Forum"]);
});

test("folds Danish letters, so norreport finds Nørreport", () => {
  assert.deepEqual(matchedStations("togstop norreport", covers), ["Nørreport"]);
});

test("a typed word of four letters or more can start a station name", () => {
  assert.deepEqual(matchedStations("fasan", covers), ["Fasanvej"]);
});

test("short words do not match", () => {
  assert.deepEqual(matchedStations("ved for", covers), []);
});

test("shows stored lower-case names as names", () => {
  const lower = [
    { trackNumber: 1, stationA: "kongens nytorv", stationB: "nørreport" },
  ];
  assert.deepEqual(matchedStations("nørreport", lower), ["Nørreport"]);
  assert.equal(routeLabel(lower), "Kongens Nytorv ↔ Nørreport");
});

test("no covers gives no matches", () => {
  assert.deepEqual(matchedStations("Forum", undefined), []);
});

test("a chain of segments shows its two ends", () => {
  assert.equal(routeLabel(covers), "Fasanvej ↔ Nørreport");
});

test("a branching scenario shows its first stretch and the rest as a count", () => {
  const branching = [
    { trackNumber: 1, stationA: "a", stationB: "b" },
    { trackNumber: 1, stationA: "b", stationB: "c" },
    { trackNumber: 1, stationA: "b", stationB: "d" },
  ];
  assert.equal(routeLabel(branching), "A ↔ B og 2 flere");
});

test("no covers gives no route", () => {
  assert.equal(routeLabel(undefined), "");
});
