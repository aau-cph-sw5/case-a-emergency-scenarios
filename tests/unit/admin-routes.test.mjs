import assert from "node:assert/strict";
import test from "node:test";
import { getLines } from "../../mockData/data.tsx";
import { resolveStops } from "../../shared/network/network.ts";

const lines = getLines();
import {
  crossoverOnSegment,
  coverageCandidates,
  groupCrossovers,
  groupLines,
  groupStations,
  roundtripTurnbacks,
  usesCrossover,
} from "../../web/src/admin-routes.ts";

function testPath(from, to) {
  const result = resolveStops([from, to], groupLines("M1/M2", lines), [], []);
  assert.equal(result.incomplete, false);
  return [from, ...result.connections.map(([, station]) => station)];
}

test("station lists are limited to their line group", () => {
  assert.ok(groupStations("M1/M2", lines).includes("VAN"));
  assert.ok(!groupStations("M3/M4", lines).includes("VAN"));
});

test("routes and stations come from the supplied network", () => {
  const supplied = [
    {
      name: "M1",
      tracks: [1],
      connections: [
        ["API_A", "API_B"],
        ["API_B", "API_C"],
      ],
    },
  ];
  assert.deepEqual(groupStations("M1/M2", supplied), [
    "API_A",
    "API_B",
    "API_C",
  ]);
});

test("route options require the selected tracks on every segment", () => {
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
  ];
  assert.equal(
    resolveStops(["A", "C"], supplied, segments, [1]).incomplete,
    false,
  );
  assert.equal(
    resolveStops(["A", "C"], supplied, segments, [2]).incomplete,
    true,
  );
  assert.equal(
    resolveStops(["A", "C"], supplied, segments, [1, 2]).incomplete,
    true,
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

test("only crossovers at the ends of a roundtrip are used for turning", () => {
  const path = testPath("VAN", "KGN");
  assert.equal(usesCrossover(path, { between: ["VAN", "FL"] }), true);
  assert.equal(usesCrossover(path, { between: ["KN", "KGN"] }), true);
  assert.equal(usesCrossover(path, { between: ["FB", "FOR"] }), false);
  assert.equal(
    usesCrossover([...path].reverse(), { between: ["VAN", "FL"] }),
    true,
  );
  assert.equal(usesCrossover([], { between: ["VAN", "FL"] }), false);
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

test("the additional M1/M2 crossovers allow turning at their endpoints", () => {
  for (const [a, b] of [
    ["LGP", "ØSV"],
    ["AMS", "FEØ"],
    ["KHS", "BC"],
    ["ØRE", "VEA"],
  ]) {
    assert.ok(crossoverOnSegment("M1/M2", a, b));
  }
  const path = testPath("LGP", "FEØ");
  assert.deepEqual(roundtripTurnbacks("M1/M2", path), {
    start: true,
    end: true,
  });
});

test("crossovers are matched on a track segment in either direction", () => {
  assert.ok(crossoverOnSegment("M1/M2", "VAN", "FL"));
  assert.ok(crossoverOnSegment("M1/M2", "FL", "VAN"));
  assert.equal(crossoverOnSegment("M1/M2", "FL", "LIT"), undefined);
  assert.equal(crossoverOnSegment("M3/M4", "VAN", "FL"), undefined);
});

test("roundtrip turnbacks must be on the first and last route segments", () => {
  const valid = testPath("VAN", "KGN");
  assert.deepEqual(roundtripTurnbacks("M1/M2", valid), {
    start: true,
    end: true,
  });
  assert.deepEqual(roundtripTurnbacks("M1/M2", [...valid].reverse()), {
    start: true,
    end: true,
  });
  assert.deepEqual(roundtripTurnbacks("M1/M2", ["VAN", "FL", "LIT"]), {
    start: true,
    end: false,
  });
  assert.deepEqual(roundtripTurnbacks("M1/M2", []), {
    start: false,
    end: false,
  });
});
