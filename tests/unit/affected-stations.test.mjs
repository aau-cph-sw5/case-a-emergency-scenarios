import { test } from "node:test";
import assert from "node:assert/strict";
import {
  affectedStations,
  affectedStretchAsMapLine,
} from "../../mobile/src/screens/affected-stations.ts";

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
