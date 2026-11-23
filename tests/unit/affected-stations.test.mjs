import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionKey } from "../../shared/network/network.ts";
import {
  affectedStations,
  affectedStretchAsMapLine,
  areaAroundStations,
  linesThrough,
  networkWithoutStretch,
  requiredStations,
  samePiece,
} from "../../shared/scenario/affected-stations.ts";

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

const network = [
  {
    name: "M1",
    connections: [
      ["FOR", "KGN"],
      ["ISB", "UNI"],
    ],
  },
  {
    name: "M2",
    connections: [
      ["FOR", "KGN"],
      ["KHC", "AMB"],
    ],
  },
  { name: "M4", connections: [["NEL", "MOP"]] },
];

test("keeps the line through a covered piece, in either direction", () => {
  assert.deepEqual(
    linesThrough(network, [["UNI", "ISB"]]).map((line) => line.name),
    ["M1"],
  );
});

test("keeps both lines when a covered piece is on two lines", () => {
  assert.deepEqual(
    linesThrough(network, [["FOR", "KGN"]]).map((line) => line.name),
    ["M1", "M2"],
  );
});

test("keeps no line when no covered piece is on a line", () => {
  assert.deepEqual(linesThrough(network, [["FOR", "XYZ"]]), []);
});

const versioned = {
  currentVersion: "2",
  versions: [
    { version: "1", stationRequirements: [{ station: "VEA" }] },
    {
      version: "2",
      stationRequirements: [
        { station: "KGN" },
        { station: "FOR" },
        { station: "KGN" },
      ],
    },
  ],
};

test("lists the stations of the current version once each, in order", () => {
  assert.deepEqual(requiredStations(versioned), ["KGN", "FOR"]);
});

test("lists no stations when the current version requires none", () => {
  assert.deepEqual(
    requiredStations({ currentVersion: "1", versions: [{ version: "1" }] }),
    [],
  );
});

test("builds per-track connectionTracks and deduplicates reversed connections", () => {
  const stretch = affectedStretchAsMapLine({
    name: "Single and double track",
    covers: [
      { trackNumber: 1, stationA: "FOR", stationB: "KN" },
      { trackNumber: 2, stationA: "KN", stationB: "FOR" },
      { trackNumber: 1, stationA: "FOR", stationB: "KN" },
      { trackNumber: 2, stationA: "KN", stationB: "KGN" },
    ],
  });

  assert.deepEqual(stretch, {
    name: "Single and double track",
    tracks: [1, 2],
    connections: [
      ["FOR", "KN"],
      ["KN", "KGN"],
    ],
    connectionTracks: {
      [connectionKey("FOR", "KN")]: [1, 2],
      [connectionKey("KN", "KGN")]: [2],
    },
  });
});

test("returns empty stretch metadata when scenario has no covers", () => {
  assert.deepEqual(affectedStretchAsMapLine(scenarioWithoutStations), {
    name: "no covers",
    tracks: [],
    connections: [],
    connectionTracks: {},
  });
});

test("keeps synthetic stations when position filtering is disabled", () => {
  const stretch = affectedStretchAsMapLine(
    {
      name: "Synthetic",
      covers: [{ trackNumber: 2, stationA: "A", stationB: "B" }],
    },
    null,
  );
  assert.deepEqual(stretch, {
    name: "Synthetic",
    tracks: [2],
    connections: [["A", "B"]],
    connectionTracks: {
      [connectionKey("A", "B")]: [2],
    },
  });
});

test("samePiece matches identical and reversed station pairs", () => {
  assert.equal(samePiece(["FOR", "KN"], ["FOR", "KN"]), true);
  assert.equal(samePiece(["FOR", "KN"], ["KN", "FOR"]), true);
  assert.equal(samePiece(["FOR", "KN"], ["KN", "KGN"]), false);
});
