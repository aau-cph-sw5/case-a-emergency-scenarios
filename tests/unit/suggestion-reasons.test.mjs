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

const lower = [
  { trackNumber: 1, stationA: "kongens nytorv", stationB: "nørreport" },
];
const branching = [
  { trackNumber: 1, stationA: "a", stationB: "b" },
  { trackNumber: 1, stationA: "b", stationB: "c" },
  { trackNumber: 1, stationA: "b", stationB: "d" },
];

for (const [name, text, list, expected] of [
  [
    "finds a station named in the description",
    "signalfejl ved Forum",
    covers,
    ["Forum"],
  ],
  [
    "folds Danish letters, so norreport finds Nørreport",
    "togstop norreport",
    covers,
    ["Nørreport"],
  ],
  [
    "a typed word of four letters or more can start a station name",
    "fasan",
    covers,
    ["Fasanvej"],
  ],
  ["short words do not match", "ved for", covers, []],
  ["shows stored lower-case names as names", "nørreport", lower, ["Nørreport"]],
  ["no covers gives no matches", "Forum", undefined, []],
]) {
  test(name, () => assert.deepEqual(matchedStations(text, list), expected));
}

for (const [name, list, expected] of [
  [
    "shows stored lower-case names as names in the route",
    lower,
    "Kongens Nytorv ↔ Nørreport",
  ],
  ["a chain of segments shows its two ends", covers, "Fasanvej ↔ Nørreport"],
  [
    "a branching scenario shows its first stretch and the rest as a count",
    branching,
    "A ↔ B og 2 flere",
  ],
  ["no covers gives no route", undefined, ""],
]) {
  test(name, () => assert.equal(routeLabel(list), expected));
}
