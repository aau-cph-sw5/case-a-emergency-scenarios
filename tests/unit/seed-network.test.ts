import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateNetwork,
  type NetworkSeed,
} from "../../scripts/seed-network.js";

function demo(): NetworkSeed {
  return {
    stations: [
      { code: "A", name: "Station A", x: 100, y: 200 },
      { code: "B", name: "Station B", x: 200, y: 200 },
    ],
    segments: [
      { trackNumber: 1, stationA: "A", stationB: "B" },
      { trackNumber: 2, stationA: "A", stationB: "B" },
    ],
    normalPatterns: [
      {
        line: "M1",
        routeCode: "TEST",
        operationType: "ROUNDTRIP",
        trackNumber: 12,
        maximumTrains: 1,
        did: "TEST",
        color: "#008D40",
        stops: ["A", "B"],
      },
    ],
  };
}

test("synthetic network is valid", () => {
  assert.deepEqual(validateNetwork(demo()), []);
});

test("rejects duplicate segments in either direction", () => {
  const data = demo();
  const segment = data.segments[0];
  data.segments.push({
    ...segment,
    stationA: segment.stationB,
    stationB: segment.stationA,
  });
  assert.match(validateNetwork(data).join("\n"), /repeats a track segment/);
});

test("keeps distinct station codes separate when checking reversed segments", () => {
  const data = demo();
  data.stations.push({ code: "a", name: "Station a", x: 300, y: 200 });
  data.segments.push({ trackNumber: 1, stationA: "B", stationB: "a" });
  assert.deepEqual(validateNetwork(data), []);
  data.segments.push({ trackNumber: 1, stationA: "a", stationB: "B" });
  assert.match(validateNetwork(data).join("\n"), /repeats a track segment/);
});

test("requires real pattern values and known stations", () => {
  const data = demo();
  data.normalPatterns[0].did = "";
  data.normalPatterns[0].stops = ["Station A", "unknown"];
  assert.match(
    validateNetwork(data).join("\n"),
    /DID, hex color and at least two known stops/,
  );
});

test("rejects malformed network data before database writes", () => {
  assert.match(validateNetwork({} as NetworkSeed).join("\n"), /must contain/);
  const data = demo();
  data.stations[0].x = Infinity;
  assert.match(validateNetwork(data).join("\n"), /finite x\/y/);
});

test("requires a six-digit hex color for each normal pattern", () => {
  for (const color of [undefined, "", "green", "#fff", "#zzzzzz"]) {
    const data = demo();
    data.normalPatterns[0].color = color as string;
    assert.match(validateNetwork(data).join("\n"), /hex color/);
  }
});
