import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getLines } from "../../mockData/data.tsx";

const stations = JSON.parse(
  readFileSync(
    new URL("../../docs/scenario-state/stations.json", import.meta.url),
  ),
);

test("every station is placed on at least one line in mockData/data.tsx", () => {
  const lines = getLines();
  const stationsOnALine = [];
  for (const line of lines) {
    for (const connection of line.connections) {
      stationsOnALine.push(connection[0]);
      stationsOnALine.push(connection[1]);
    }
  }

  for (const station of stations) {
    assert.ok(
      stationsOnALine.includes(station.code),
      `${station.name} (${station.code}) is not placed on any line in mockData/data.tsx`,
    );
  }
});
