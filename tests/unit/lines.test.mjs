import { test } from "node:test";
import assert from "node:assert/strict";
import { describeCovers } from "../../web/src/lines.ts";

test("shows each station of a covered segment with its line", () => {
  assert.deepEqual(
    describeCovers([
      { trackNumber: 1, stationA: "Station A", stationB: "Station B" },
    ]),
    ["Station A M1 – Station B M1"],
  );
  assert.deepEqual(
    describeCovers([
      { trackNumber: 2, stationA: "Station F", stationB: "Station G" },
    ]),
    ["Station F M2 – Station G M2"],
  );
});

test("keeps an unknown station as it is, and shows nothing without covers", () => {
  assert.deepEqual(
    describeCovers([
      { trackNumber: 1, stationA: "Station X", stationB: "Station C" },
    ]),
    ["Station X – Station C M1"],
  );
  assert.deepEqual(describeCovers(undefined), []);
});
