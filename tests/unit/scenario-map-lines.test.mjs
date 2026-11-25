import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionKey } from "../../shared/network/network.ts";
import {
  CLOSED_LINE,
  closedStretchLine,
  routeColor,
  routeStops,
  scenarioLines,
} from "../../shared/scenario/map-lines.ts";

const m1m2Lines = [
  {
    name: "M1",
    color: "#007756",
    tracks: [1, 2],
    connections: [
      ["VAN", "FL"],
      ["FL", "FB"],
      ["FB", "FOR"],
      ["FOR", "KGN"],
      ["KGN", "ISB"],
    ],
  },
  {
    name: "M2",
    color: "#ffc500",
    tracks: [1, 2],
    connections: [
      ["VAN", "FL"],
      ["FL", "FB"],
      ["FB", "FOR"],
      ["FOR", "KGN"],
      ["KGN", "KHC"],
    ],
  },
];

const m3m4Lines = [
  {
    name: "M3",
    color: "#e6312d",
    tracks: [1, 2],
    connections: [
      ["KBH", "RAD"],
      ["RAD", "GLS"],
    ],
  },
  {
    name: "M4",
    color: "#0099d5",
    tracks: [1, 2],
    connections: [
      ["KBH", "RAD"],
      ["RAD", "ORI"],
    ],
  },
];

const allPairs = [
  ["VAN", "FL"],
  ["FL", "FB"],
  ["FB", "FOR"],
  ["FOR", "KGN"],
  ["KGN", "ISB"],
  ["KGN", "KHC"],
  ["KBH", "RAD"],
  ["RAD", "GLS"],
  ["RAD", "ORI"],
];

const segments = allPairs.flatMap(([stationA, stationB], index) => [
  { id: index * 2 + 1, trackNumber: 1, stationA, stationB },
  { id: index * 2 + 2, trackNumber: 2, stationA, stationB },
]);

const makeRoute = (...stations) =>
  stations.map((station, index) => ({ sequence: index + 1, station }));

const makePattern = (did, trackNumber, route, extra = {}) => ({
  did,
  trackNumber,
  route,
  ...extra,
});

const makeScenario = ({
  lineGroup = "M1_M2",
  currentVersion = "1",
  covers,
  versions,
  patterns = [],
}) => ({
  lineGroup,
  currentVersion,
  covers,
  versions: versions ?? [{ version: "1", operatingPlan: { patterns } }],
});

const fallback = "#202020";

test("routeStops sorts by numeric sequence, defaults non-numbers to 0, and rejects short or invalid stops", () => {
  assert.deepEqual(
    routeStops([
      { sequence: 2, station: "FOR" },
      { sequence: 1, station: "FB" },
    ]),
    ["FB", "FOR"],
  );
  assert.deepEqual(
    routeStops([
      { sequence: 2, station: "FOR" },
      { sequence: "first", station: "VAN" },
      { station: "FL" },
    ]),
    ["VAN", "FL", "FOR"],
  );
  assert.equal(routeStops([]), null);
  assert.equal(routeStops([{ sequence: 1, station: "VAN" }]), null);
  assert.equal(
    routeStops([
      { sequence: 1, station: "VAN" },
      { sequence: 2, station: 42 },
    ]),
    null,
  );
});

test("scenarioLines resolves patterns sorted by numeric did, skips blank did, and expands track 12", () => {
  const scenario = makeScenario({
    currentVersion: "2",
    covers: [{ trackNumber: 2, stationA: "FB", stationB: "FOR" }],
    versions: [
      {
        version: "1",
        operatingPlan: {
          patterns: [makePattern("99", 1, makeRoute("VAN", "FL"))],
        },
      },
      {
        version: "2",
        operatingPlan: {
          patterns: [
            makePattern("   ", 1, makeRoute("VAN", "FL")),
            makePattern("10", 12, makeRoute("FOR", "ISB"), {
              color: "#112233",
            }),
            makePattern("2", 1, [
              { sequence: 2, station: "FOR" },
              { sequence: 1, station: "FB" },
            ]),
          ],
        },
      },
    ],
  });

  const result = scenarioLines(scenario, m1m2Lines, segments);

  assert.equal(result.missingRoutes, false);
  assert.deepEqual(result.lines, [
    {
      name: "2",
      color: undefined,
      tracks: [1],
      connections: [["FB", "FOR"]],
    },
    {
      name: "10",
      color: "#112233",
      tracks: [1, 2],
      connections: [
        ["FOR", "KGN"],
        ["KGN", "ISB"],
      ],
    },
  ]);
  assert.deepEqual(result.closedLine, {
    name: CLOSED_LINE,
    tracks: [2],
    connections: [["FB", "FOR"]],
    connectionTracks: {
      [connectionKey("FB", "FOR")]: [2],
    },
  });
});

test("scenarioLines resolves M3_M4 scenarios against M3/M4 group lines", () => {
  const scenario = makeScenario({
    lineGroup: "M3_M4",
    covers: [{ trackNumber: 1, stationA: "RAD", stationB: "ORI" }],
    patterns: [makePattern("1", 2, makeRoute("KBH", "GLS"))],
  });

  const result = scenarioLines(scenario, m3m4Lines, segments);

  assert.equal(result.missingRoutes, false);
  assert.deepEqual(result.lines, [
    {
      name: "1",
      color: undefined,
      tracks: [2],
      connections: [
        ["KBH", "RAD"],
        ["RAD", "GLS"],
      ],
    },
  ]);
  assert.deepEqual(result.closedLine, {
    name: CLOSED_LINE,
    tracks: [1],
    connections: [["RAD", "ORI"]],
    connectionTracks: {
      [connectionKey("RAD", "ORI")]: [1],
    },
  });
});

test("scenarioLines returns empty routes, null closedLine, and missingRoutes false on line-group mismatch", () => {
  const scenario = makeScenario({
    lineGroup: "M3_M4",
    covers: [{ trackNumber: 1, stationA: "KBH", stationB: "RAD" }],
    patterns: [makePattern("1", 1, makeRoute("KBH", "RAD"))],
  });

  assert.deepEqual(scenarioLines(scenario, m1m2Lines, segments), {
    lines: [],
    closedLine: null,
    missingRoutes: false,
  });
});

test("scenarioLines reports missingRoutes for short, invalid, and unresolvable routes", () => {
  const scenario = makeScenario({
    patterns: [
      makePattern("1", 1, [{ sequence: 1, station: "VAN" }]),
      makePattern("2", 1, [
        { sequence: 1, station: "VAN" },
        { sequence: 2, station: "FL" },
        { sequence: 3 },
      ]),
      makePattern("3", 1, makeRoute("VAN", "UNKNOWN")),
    ],
  });

  const result = scenarioLines(scenario, m1m2Lines, segments);

  assert.equal(result.missingRoutes, true);
  assert.equal(result.closedLine, null);
  assert.deepEqual(result.lines, [
    { name: "1", color: undefined, tracks: [1], connections: [] },
    { name: "2", color: undefined, tracks: [1], connections: [] },
    { name: "3", color: undefined, tracks: [1], connections: [] },
  ]);
});

test("scenarioLines reports missingRoutes for empty patterns or missing current version and still builds closedLine", () => {
  const baseCovers = [{ trackNumber: 1, stationA: "VAN", stationB: "FL" }];
  const expectedClosedLine = {
    name: CLOSED_LINE,
    tracks: [1],
    connections: [["VAN", "FL"]],
    connectionTracks: { [connectionKey("VAN", "FL")]: [1] },
  };

  assert.deepEqual(
    scenarioLines(
      makeScenario({ covers: baseCovers, patterns: [] }),
      m1m2Lines,
      segments,
    ),
    {
      lines: [],
      closedLine: expectedClosedLine,
      missingRoutes: true,
    },
  );

  assert.deepEqual(
    scenarioLines(
      makeScenario({
        currentVersion: "missing",
        covers: baseCovers,
        patterns: [makePattern("1", 1, makeRoute("VAN", "FL"))],
      }),
      m1m2Lines,
      segments,
    ),
    {
      lines: [],
      closedLine: expectedClosedLine,
      missingRoutes: true,
    },
  );
});

test("routeColor returns the single matching Metro line colour regardless of direction", () => {
  assert.equal(
    routeColor(
      {
        connections: [
          ["ISB", "KGN"],
          ["KGN", "FOR"],
        ],
      },
      m1m2Lines,
      fallback,
    ),
    "#007756",
  );
  assert.equal(
    routeColor({ connections: [["KGN", "KHC"]] }, m1m2Lines, fallback),
    "#ffc500",
  );
});

test("routeColor falls back for shared, unmatched, empty, or colourless line matches", () => {
  assert.equal(
    routeColor({ connections: [["FOR", "KGN"]] }, m1m2Lines, fallback),
    fallback,
  );
  assert.equal(
    routeColor({ connections: [["KBH", "RAD"]] }, m1m2Lines, fallback),
    fallback,
  );
  assert.equal(
    routeColor({ connections: [] }, [m1m2Lines[0]], fallback),
    fallback,
  );
  assert.equal(
    routeColor(
      { connections: [["KGN", "ISB"]] },
      [{ name: "M1", tracks: [1], connections: [["KGN", "ISB"]] }],
      fallback,
    ),
    fallback,
  );
});

test("closedStretchLine keeps a single-track closure on track 2 next to a running route on track 1", () => {
  const closed = closedStretchLine(
    [
      { trackNumber: 1, stationA: "FB", stationB: "FOR" },
      { trackNumber: 2, stationA: "FB", stationB: "FOR" },
    ],
    [{ name: "1", tracks: [1], connections: [["FB", "FOR"]] }],
  );

  assert.deepEqual(closed, {
    name: CLOSED_LINE,
    tracks: [2],
    connections: [["FB", "FOR"]],
    connectionTracks: {
      [connectionKey("FB", "FOR")]: [2],
    },
  });
});

test("closedStretchLine respects per-connection connectionTracks on running routes", () => {
  const closed = closedStretchLine(
    [
      { trackNumber: 2, stationA: "FOR", stationB: "FB" },
      { trackNumber: 2, stationA: "FOR", stationB: "KGN" },
    ],
    [
      {
        name: "1",
        tracks: [1, 2],
        connections: [
          ["FB", "FOR"],
          ["FOR", "KGN"],
        ],
        connectionTracks: {
          [connectionKey("FB", "FOR")]: [1],
          [connectionKey("FOR", "KGN")]: [1, 2],
        },
      },
    ],
  );

  assert.deepEqual(closed, {
    name: CLOSED_LINE,
    tracks: [2],
    connections: [["FOR", "FB"]],
    connectionTracks: {
      [connectionKey("FB", "FOR")]: [2],
    },
  });
});

test("closedStretchLine returns null when every covered segment is drawn on the same track or covers are absent", () => {
  const running = [{ name: "1", tracks: [1, 2], connections: [["FB", "FOR"]] }];

  assert.equal(
    closedStretchLine(
      [
        { trackNumber: 1, stationA: "FOR", stationB: "FB" },
        { trackNumber: 2, stationA: "FB", stationB: "FOR" },
      ],
      running,
    ),
    null,
  );
  assert.equal(closedStretchLine([], running), null);
  assert.equal(closedStretchLine(undefined, running), null);
});
