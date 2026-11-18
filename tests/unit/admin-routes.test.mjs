import assert from "node:assert/strict";
import test from "node:test";
import { getLines } from "../../mockData/data.tsx";

const lines = getLines();
import {
  crossoverOnSegment,
  coverageCandidates,
  groupCrossovers,
  groupLines,
  groupStations,
  roundtripTurnbacks,
  routesBetween,
  usesCrossover,
} from "../../web/src/admin-routes.ts";

test("finds connected stations and offers alternative routes around M3", () => {
  assert.ok(groupStations("M1/M2", lines).includes("VAN"));
  assert.ok(!groupStations("M3/M4", lines).includes("VAN"));
  assert.deepEqual(routesBetween("M1/M2", "VAN", "LIT", lines), [
    ["VAN", "FL", "LIT"],
  ]);
  const paths = routesBetween("M3/M4", "KGN", "KH", lines);
  assert.ok(paths.length > 1);
  assert.ok(paths.every((path) => path[0] === "KGN" && path.at(-1) === "KH"));
  assert.deepEqual(routesBetween("M1/M2", "VAN", "VAN", lines), []);
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
  assert.deepEqual(routesBetween("M1/M2", "API_A", "API_C", supplied), [
    ["API_A", "API_B", "API_C"],
  ]);
  assert.deepEqual(routesBetween("M1/M2", "VAN", "API_A", supplied), []);
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
  assert.deepEqual(routesBetween("M1/M2", "A", "C", supplied, segments, 1), [
    ["A", "B", "C"],
  ]);
  assert.deepEqual(routesBetween("M1/M2", "A", "C", supplied, segments, 2), []);
  assert.deepEqual(
    routesBetween("M1/M2", "A", "C", supplied, segments, 12),
    [],
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
  const path = routesBetween("M1/M2", "VAN", "KGN", lines)[0];
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
  const path = routesBetween("M1/M2", "LGP", "FEØ", lines)[0];
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
  const valid = routesBetween("M1/M2", "VAN", "KGN", lines)[0];
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
