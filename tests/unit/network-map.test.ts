import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMapNetwork,
  isNetwork,
  resolveStops,
  connectionKey,
} from "../../shared/network/network.js";
import {
  loadNetwork,
  saveNetwork,
  NETWORK_STORAGE_KEY,
  clearNetwork,
} from "../../shared/network/cache.js";
import type { Network } from "../../shared/types/v1/network.js";

const network: Network = {
  stations: [
    { code: "A", name: "A", x: 10, y: 20 },
    { code: "B", name: "B", x: 30, y: 40 },
  ],
  segments: [{ id: 1, trackNumber: 1, stationA: "A", stationB: "B" }],
  normalPatterns: [
    {
      line: "M1",
      routeCode: "A-B",
      operationType: "PENDULUM",
      maximumTrains: 1,
      did: "TEST",
      trackNumber: 1,
      stops: ["A", "B"],
    },
  ],
};

for (const line of ["M2", "M3", "M4"] as const) {
  network.normalPatterns.push({ ...network.normalPatterns[0], line });
}

test("network map uses stored positions and connected normal stops", () => {
  assert.equal(isNetwork(network), true);
  const map = buildMapNetwork(network);
  assert.deepEqual(map.positions.A, [10, 20]);
  assert.deepEqual(map.lines[0].connections, [["A", "B"]]);
  assert.equal(map.incomplete, false);
});

test("network map does not invent a direct segment for disconnected stops", () => {
  const map = buildMapNetwork({ ...network, segments: [] });
  assert.deepEqual(map.lines[0].connections, []);
  assert.equal(map.incomplete, true);
});

test("rejects malformed network responses", () => {
  assert.equal(
    isNetwork({ ...network, stations: [{ code: "A", x: "10", y: 20 }] }),
    false,
  );
});

test("resolves a non-stop station without inventing a shortcut", () => {
  const lines = [
    {
      name: "M1",
      tracks: [1],
      connections: [
        ["A", "B"],
        ["B", "C"],
      ] as [string, string][],
    },
  ];
  const segments: Network["segments"] = [
    { id: 1, trackNumber: 1, stationA: "A", stationB: "B" },
    { id: 2, trackNumber: 1, stationA: "B", stationB: "C" },
  ];
  assert.deepEqual(resolveStops(["A", "C"], lines, segments, [1]), {
    connections: [
      ["A", "B"],
      ["B", "C"],
    ],
    incomplete: false,
  });
});

test("does not guess between different paths", () => {
  const lines = [
    {
      name: "M3",
      tracks: [1],
      connections: [
        ["A", "B"],
        ["B", "C"],
        ["A", "D"],
        ["D", "C"],
      ] as [string, string][],
    },
  ];
  const segments: Network["segments"] = lines[0].connections.map(
    ([a, b], index) => ({
      id: index + 1,
      trackNumber: 1,
      stationA: a,
      stationB: b,
    }),
  );
  assert.deepEqual(resolveStops(["A", "C"], lines, segments, [1]), {
    connections: [],
    incomplete: true,
  });
});

test("network cache preserves a usable map when an empty response arrives", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
  await saveNetwork(storage, network);
  await saveNetwork(storage, {
    stations: [],
    segments: [],
    normalPatterns: [],
  });
  assert.deepEqual(await loadNetwork(storage), network);
  values.set(NETWORK_STORAGE_KEY, "bad data");
  assert.equal(await loadNetwork(storage), null);
});

test("keeps track membership per connection when a line has multiple patterns", () => {
  const map = buildMapNetwork({
    stations: [
      { code: "A", name: "A", x: 0, y: 0 },
      { code: "B", name: "B", x: 10, y: 0 },
      { code: "C", name: "C", x: 20, y: 0 },
    ],
    segments: [
      { id: 1, trackNumber: 1, stationA: "A", stationB: "B" },
      { id: 2, trackNumber: 2, stationA: "A", stationB: "B" },
      { id: 3, trackNumber: 2, stationA: "B", stationB: "C" },
    ],
    normalPatterns: [
      {
        line: "M1",
        routeCode: "AB",
        operationType: "PENDULUM",
        trackNumber: 1,
        maximumTrains: 1,
        did: "1",
        stops: ["A", "B"],
      },
      {
        line: "M1",
        routeCode: "BC",
        operationType: "PENDULUM",
        trackNumber: 2,
        maximumTrains: 1,
        did: "2",
        stops: ["B", "C"],
      },
    ],
  });
  const line = map.lines[0];
  assert.deepEqual(line.connectionTracks?.[connectionKey("A", "B")], [1]);
  assert.deepEqual(resolveStops(["A", "B"], [line], map.segments, [2]), {
    connections: [],
    incomplete: true,
  });
});

test("network cache writes complete in the order requested", async () => {
  let release: (() => void) | undefined;
  let stored: string | null = null;
  let calls = 0;
  const storage = {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => {
      calls++;
      if (calls === 1)
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      stored = value;
    },
    removeItem: async () => {
      stored = null;
    },
  };
  const newer = {
    ...network,
    stations: network.stations.map((station) => ({
      ...station,
      x: station.x === null ? null : station.x + 1,
    })),
  };
  const first = saveNetwork(storage, network);
  const second = saveNetwork(storage, newer);
  await Promise.resolve();
  assert.equal(calls, 1);
  release!();
  await Promise.all([first, second]);
  assert.deepEqual(await loadNetwork(storage), newer);
});

test("signing out clears a network after any pending save", async () => {
  let release: (() => void) | undefined;
  let stored: string | null = null;
  const storage = {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      stored = value;
    },
    removeItem: async () => {
      stored = null;
    },
  };
  const save = saveNetwork(storage, network);
  const clear = clearNetwork(storage);
  await Promise.resolve();
  release!();
  await Promise.all([save, clear]);
  assert.equal(await loadNetwork(storage), null);
});
