import { test } from "node:test";
import assert from "node:assert/strict";
import {
  affectedStations,
  affectedStretchAsMapLine,
  areaAroundStations,
  networkWithoutStretch,
} from "../../mobile/src/screens/affected-stations.tsx";

const scenario = {
  name: "Test scenario",
  covers: [
    { trackNumber: 1, stationA: "FOR", stationB: "KN" },
    { trackNumber: 1, stationA: "KN", stationB: "KGN" },
  ],
};

const scenarioWithoutStations = {
  name: "no covers",
};

const scenarioUnknownStation = {
  name: "unkown station",
  covers: [
    { trackNumber: 1, stationA: "FOR", stationB: "xyz" },
    { trackNumber: 1, stationA: "KN", stationB: "KGN" },
  ],
};

const networkWithKnFor = [
  {
    name: "M2",
    connections: [
      ["FOR", "KN"],
      ["KN", "KGN"],
      ["KGN", "KHC"],
    ],
  },
];

const stretchKnFor = [["KN", "FOR"]];

test("list each affected station once in order", () => {
  assert.deepEqual(affectedStations(scenario), ["FOR", "KN", "KGN"]);
});

test("return an empty list, when the scenario has no covers", () => {
  assert.deepEqual(affectedStations(scenarioWithoutStations), []);
});

test("leaves out map pieces that the map does not have svg position for", () => {
  assert.deepEqual(
    affectedStretchAsMapLine(scenarioUnknownStation).connections,
    [["KN", "KGN"]],
  );
});

test("zooms the map with calculations with the margin", () => {
  assert.equal(areaAroundStations(["FOR", "KN", "KGN"]), "405 283 303 124");
});

test("returns undefined when no station has a position on the map", () => {
  assert.equal(areaAroundStations(["XYZ"]), undefined);
});

test("Removes the stretchs pieces from the network in one of the directions", () => {
  assert.deepEqual(networkWithoutStretch(networkWithKnFor, stretchKnFor), [
    {
      name: "M2",
      connections: [
        ["KN", "KGN"],
        ["KGN", "KHC"],
      ],
    },
  ]);
});
