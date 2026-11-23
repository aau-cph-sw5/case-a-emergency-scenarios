import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionKey } from "../../shared/network/network.ts";
import {
  CLOSED_LINE,
  closedStretchLine,
  routeColor,
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

test("CLOSED_LINE uses the Danish label", () => {
  assert.equal(CLOSED_LINE, "Spærret");
});

test("scenarioLines resolves patterns sorted by numeric did, skips blank did, and expands track 12", () => {
  const scenario = {
    lineGroup: "M1_M2",
    currentVersion: "2",
    covers: [{ trackNumber: 2, stationA: "FB", stationB: "FOR" }],
    versions: [
      {
        version: "1",
        operatingPlan: {
          patterns: [
            {
              did: "99",
              trackNumber: 1,
              route: [
                { sequence: 1, station: "VAN" },
                { sequence: 2, station: "FL" },
              ],
            },
          ],
        },
      },
      {
        version: "2",
        operatingPlan: {
          patterns: [
            {
              did: "   ",
              trackNumber: 1,
              route: [
                { sequence: 1, station: "VAN" },
                { sequence: 2, station: "FL" },
              ],
            },
            {
              did: "10",
              trackNumber: 12,
              color: "#112233",
              route: [
                { sequence: 1, station: "FOR" },
                { sequence: 2, station: "ISB" },
              ],
            },
            {
              did: "2",
              trackNumber: 1,
              route: [
                { sequence: 2, station: "FOR" },
                { sequence: 1, station: "FB" },
              ],
            },
          ],
        },
      },
    ],
  };

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
  const scenario = {
    lineGroup: "M3_M4",
    currentVersion: "1",
    covers: [{ trackNumber: 1, stationA: "RAD", stationB: "ORI" }],
    versions: [
      {
        version: "1",
        operatingPlan: {
          patterns: [
            {
              did: "1",
              trackNumber: 2,
              route: [
                { sequence: 1, station: "KBH" },
                { sequence: 2, station: "GLS" },
              ],
            },
          ],
        },
      },
    ],
  };

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
  const scenario = {
    lineGroup: "M3_M4",
    currentVersion: "1",
    covers: [{ trackNumber: 1, stationA: "KBH", stationB: "RAD" }],
    versions: [
      {
        version: "1",
        operatingPlan: {
          patterns: [
            {
              did: "1",
              trackNumber: 1,
              route: [
                { sequence: 1, station: "KBH" },
                { sequence: 2, station: "RAD" },
              ],
            },
          ],
        },
      },
    ],
  };

  assert.deepEqual(scenarioLines(scenario, m1m2Lines, segments), {
    lines: [],
    closedLine: null,
    missingRoutes: false,
  });
});

test("scenarioLines reports missingRoutes for short, invalid, and unresolvable routes", () => {
  const scenario = {
    lineGroup: "M1_M2",
    currentVersion: "1",
    versions: [
      {
        version: "1",
        operatingPlan: {
          patterns: [
            {
              did: "1",
              trackNumber: 1,
              route: [{ sequence: 1, station: "VAN" }],
            },
            {
              did: "2",
              trackNumber: 1,
              route: [
                { sequence: 1, station: "VAN" },
                { sequence: 2, station: "FL" },
                { sequence: 3 },
              ],
            },
            {
              did: "3",
              trackNumber: 1,
              route: [
                { sequence: 1, station: "VAN" },
                { sequence: 2, station: "UNKNOWN" },
              ],
            },
          ],
        },
      },
    ],
  };

  const result = scenarioLines(scenario, m1m2Lines, segments);

  assert.equal(result.missingRoutes, true);
  assert.equal(result.closedLine, null);
  assert.deepEqual(result.lines, [
    { name: "1", color: undefined, tracks: [1], connections: [] },
    { name: "2", color: undefined, tracks: [1], connections: [] },
    { name: "3", color: undefined, tracks: [1], connections: [] },
  ]);
});

test("scenarioLines reports missingRoutes when there are zero running patterns and still builds closedLine", () => {
  const baseCovers = [{ trackNumber: 1, stationA: "VAN", stationB: "FL" }];

  const emptyPatterns = scenarioLines(
    {
      lineGroup: "M1_M2",
      currentVersion: "1",
      covers: baseCovers,
      versions: [{ version: "1", operatingPlan: { patterns: [] } }],
    },
    m1m2Lines,
    segments,
  );
  assert.equal(emptyPatterns.missingRoutes, true);
  assert.deepEqual(emptyPatterns.lines, []);
  assert.deepEqual(emptyPatterns.closedLine, {
    name: CLOSED_LINE,
    tracks: [1],
    connections: [["VAN", "FL"]],
    connectionTracks: { [connectionKey("VAN", "FL")]: [1] },
  });

  const missingOperatingPlan = scenarioLines(
    {
      lineGroup: "M1_M2",
      currentVersion: "1",
      covers: baseCovers,
      versions: [{ version: "1" }],
    },
    m1m2Lines,
    segments,
  );
  assert.equal(missingOperatingPlan.missingRoutes, true);
  assert.deepEqual(missingOperatingPlan.lines, []);
  assert.equal(missingOperatingPlan.closedLine?.name, CLOSED_LINE);
});

test("routeColor returns the single matching Metro line colour regardless of direction", () => {
  const fallback = "#202020";
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
  const fallback = "#202020";

  // Shared between M1 and M2.
  assert.equal(
    routeColor({ connections: [["FOR", "KGN"]] }, m1m2Lines, fallback),
    fallback,
  );

  // Unmatched segment.
  assert.equal(
    routeColor({ connections: [["KBH", "RAD"]] }, m1m2Lines, fallback),
    fallback,
  );

  // Empty connections must not vacuously match a single line.
  assert.equal(
    routeColor({ connections: [] }, [m1m2Lines[0]], fallback),
    fallback,
  );

  // Matching line without a colour.
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
  const running = [
    {
      name: "1",
      tracks: [1],
      connections: [["FB", "FOR"]],
    },
  ];

  const closed = closedStretchLine(
    [
      { trackNumber: 1, stationA: "FB", stationB: "FOR" },
      { trackNumber: 2, stationA: "FB", stationB: "FOR" },
    ],
    running,
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
  const running = [
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
  ];

  const closed = closedStretchLine(
    [
      { trackNumber: 2, stationA: "FOR", stationB: "FB" },
      { trackNumber: 2, stationA: "FOR", stationB: "KGN" },
    ],
    running,
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
  const running = [
    {
      name: "1",
      tracks: [1, 2],
      connections: [["FB", "FOR"]],
    },
  ];

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
