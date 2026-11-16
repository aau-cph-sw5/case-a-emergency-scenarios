import { test } from "node:test";
import assert from "node:assert/strict";
import { network } from "../helpers/network.js";
import { buildMapNetwork } from "../../shared/network/network.js";
import {
  validateNetwork,
  type NetworkSeed,
} from "../../scripts/seed-network.js";

function demo(): NetworkSeed {
  return structuredClone(network) as NetworkSeed;
}

test("synthetic network is valid", () => {
  const data = demo();
  assert.deepEqual(validateNetwork(data), []);
  const network = {
    ...data,
    segments: data.segments.map((segment, index) => ({
      ...segment,
      id: index + 1,
    })),
  };
  assert.equal(buildMapNetwork(network).incomplete, false);
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

test("requires real pattern values and known stations", () => {
  const data = demo();
  data.normalPatterns[0].did = "";
  data.normalPatterns[0].stops = ["Station A", "unknown"];
  assert.match(
    validateNetwork(data).join("\n"),
    /DID and at least two known stops/,
  );
});

test("rejects malformed network data before database writes", () => {
  assert.match(validateNetwork({} as NetworkSeed).join("\n"), /must contain/);
  const data = demo();
  data.stations[0].x = Infinity;
  assert.match(validateNetwork(data).join("\n"), /finite x\/y/);
});
