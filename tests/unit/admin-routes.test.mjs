import assert from "node:assert/strict";
import test from "node:test";
import { getLines } from "../../mockData/data.tsx";
import { resolveStops } from "../../shared/network/network.ts";

const lines = getLines();
import {
  coverageCandidates,
  groupCrossovers,
  groupLines,
  groupStations,
  roundtripTurnbacks,
} from "../../web/src/admin-routes.ts";

test("stations come from the selected line group", () => {
  assert.ok(groupStations("M1/M2", lines).includes("VAN"));
  assert.ok(!groupStations("M3/M4", lines).includes("VAN"));
  assert.deepEqual(
    groupStations("M1/M2", [
      {
        name: "M1",
        tracks: [1],
        connections: [
          ["API_A", "API_B"],
          ["API_B", "API_C"],
        ],
      },
    ]),
    ["API_A", "API_B", "API_C"],
  );
});

test("routes require the requested tracks on the same normal-line edge", () => {
  const supplied = [
    {
      name: "M1",
      tracks: [1, 2],
      connections: [["A", "B"]],
      connectionTracks: { '["A","B"]': [1] },
    },
  ];
  const segments = [
    { id: 1, trackNumber: 1, stationA: "A", stationB: "B" },
    { id: 2, trackNumber: 2, stationA: "B", stationB: "A" },
  ];
  assert.equal(
    resolveStops(["A", "B"], supplied, segments, [1]).incomplete,
    false,
  );
  assert.equal(
    resolveStops(["A", "B"], supplied, segments, [2]).incomplete,
    true,
  );
  supplied.push({
    name: "M2",
    tracks: [2],
    connections: [["A", "B"]],
    connectionTracks: { '["A","B"]': [2] },
  });
  assert.equal(
    resolveStops(["A", "B"], supplied, segments, [1, 2]).incomplete,
    true,
  );
});

test("routes require the selected tracks on every segment", () => {
  const network = [
    {
      name: "M1",
      tracks: [1, 2],
      connections: [
        ["A", "B"],
        ["B", "C"],
      ],
    },
  ];
  const segments = [
    { id: 1, trackNumber: 1, stationA: "A", stationB: "B" },
    { id: 2, trackNumber: 2, stationA: "A", stationB: "B" },
    { id: 3, trackNumber: 1, stationA: "B", stationB: "C" },
  ];
  assert.equal(
    resolveStops(["A", "C"], network, segments, [1]).incomplete,
    false,
  );
  assert.equal(
    resolveStops(["A", "C"], network, segments, [2]).incomplete,
    true,
  );
  assert.equal(
    resolveStops(["A", "C"], network, segments, [1, 2]).incomplete,
    true,
  );
});

test("coverage proposals exclude only tracks used by the created routes", () => {
  const supplied = [
    {
      name: "M1",
      tracks: [1, 2],
      connections: [
        ["A", "B"],
        ["B", "C"],
      ],
    },
  ];
  const segments = [
    { id: 1, trackNumber: 1, stationA: "A", stationB: "B" },
    { id: 2, trackNumber: 2, stationA: "A", stationB: "B" },
    { id: 3, trackNumber: 1, stationA: "B", stationB: "C" },
    { id: 4, trackNumber: 1, stationA: "X", stationB: "Y" },
  ];
  const routes = [
    {
      id: 1,
      from: "B",
      to: "A",
      type: "PENDULUM",
      track: 1,
      did: "D",
      maximumTrains: 1,
      stations: ["B", "A"],
    },
  ];
  assert.deepEqual(
    coverageCandidates("M1/M2", supplied, segments, routes).map(
      ({ id, used }) => ({ id, used }),
    ),
    [
      { id: 1, used: true },
      { id: 2, used: false },
      { id: 3, used: false },
    ],
  );
  routes[0].track = 12;
  assert.deepEqual(
    coverageCandidates("M1/M2", supplied, segments, routes).map(
      ({ id, used }) => ({ id, used }),
    ),
    [
      { id: 1, used: true },
      { id: 2, used: true },
      { id: 3, used: false },
    ],
  );
});

test("diagram crossovers lie on segments in their own line group", () => {
  for (const group of ["M1/M2", "M3/M4"]) {
    const segments = groupLines(group, lines).flatMap(
      (line) => line.connections,
    );
    const crossovers = groupCrossovers(group);
    assert.equal(crossovers.length, group === "M1/M2" ? 9 : 5);
    for (const {
      between: [a, b],
    } of crossovers) {
      assert.ok(
        segments.some(
          ([first, second]) =>
            (first === a && second === b) || (first === b && second === a),
        ),
      );
    }
  }
});

test("roundtrip turnbacks use crossovers on the line side", () => {
  const network = lines.map((line) => ({ ...line, tracks: [1, 2] }));
  assert.deepEqual(roundtripTurnbacks("M1/M2", ["VAN", "FL", "LIT"], network), {
    start: true,
    end: false,
  });
  assert.deepEqual(roundtripTurnbacks("M1/M2", [], network), {
    start: false,
    end: false,
  });
  assert.deepEqual(
    roundtripTurnbacks("M1/M2", ["LGP", "ØSV", "AMS", "FEØ"], network),
    { start: true, end: true },
  );
});

test("turnbacks use a crossover beyond an endpoint and reserve both tracks", async () => {
  const { selectTurnbacks } = await import("../../shared/network/turnbacks.ts");
  const connections = [
    ["NEL", "MOP"],
    ["MOP", "SLU"],
    ["SLU", "EBR"],
    ["EBR", "HOL"],
  ];
  const network = [{ name: "M3", tracks: [1, 2], connections }];
  const segments = connections.flatMap(([stationA, stationB], index) =>
    [1, 2].map((trackNumber) => ({
      id: index * 2 + trackNumber,
      stationA,
      stationB,
      trackNumber,
    })),
  );
  const path = ["MOP", "SLU", "EBR"];
  const turns = selectTurnbacks("M3/M4", path, network, segments);
  assert.deepEqual(turns.start.extension, ["MOP", "NEL"]);
  assert.deepEqual(turns.end.extension, ["EBR", "HOL"]);
  assert.deepEqual(roundtripTurnbacks("M3/M4", path, network, segments), {
    start: true,
    end: true,
  });
  const lineSide = selectTurnbacks("M3/M4", ["NEL", "MOP"], network, segments);
  assert.equal(lineSide.end.extension, undefined);
  assert.deepEqual(lineSide.end.crossover.between, ["NEL", "MOP"]);
  const used = coverageCandidates("M3/M4", network, segments, [
    {
      id: 1,
      from: "MOP",
      to: "EBR",
      type: "ROUNDTRIP",
      track: 12,
      did: "D",
      color: "#ff0000",
      maximumTrains: 1,
      stations: path,
      stops: ["MOP", "EBR"],
    },
  ]);
  assert.ok(used.every((segment) => segment.used));
  const missingTrack = segments.filter((segment) => segment.id !== 2);
  assert.equal(
    selectTurnbacks("M3/M4", path, network, missingTrack).start,
    undefined,
  );
  assert.deepEqual(
    selectTurnbacks("M3/M4", ["NEL", "MOP", "NEL"], network, segments),
    {},
  );
});
