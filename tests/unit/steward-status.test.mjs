import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  INVALID_STATUS_TRANSITION,
  resetStubStatuses,
  stewardStatus,
} from "../../mobile/src/data/steward-status.ts";
import {
  statusErrorMessage,
  withOwnStatus,
} from "../../mobile/src/screens/own-status.ts";

const STATIONS = ["Station A", "Station B"];

afterEach(() => resetStubStatuses());

test("assigning a station of the scenario reports the steward on the way", async () => {
  const result = await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station B",
  });
  assert.deepEqual(result, {
    ok: true,
    own: { station: "Station B", status: "PENDING" },
  });
});

test("arrival after being on the way marks the steward as arrived", async () => {
  await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station B",
  });
  const result = await stewardStatus("ACT-1", "7", STATIONS, {
    type: "arrive",
  });
  assert.deepEqual(result, {
    ok: true,
    own: { station: "Station B", status: "MANNED" },
  });
});

test("arrival without being on the way is rejected as an invalid transition", async () => {
  const result = await stewardStatus("ACT-1", "7", STATIONS, {
    type: "arrive",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, INVALID_STATUS_TRANSITION);
});

test("a second assign in the same activation is rejected", async () => {
  await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station A",
  });
  const result = await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station B",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, INVALID_STATUS_TRANSITION);
});

test("assigning a station outside the scenario is rejected with E1004", async () => {
  const result = await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station Z",
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "E1004");
});

test("a new activation starts with no status", async () => {
  await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station A",
  });
  const result = await stewardStatus("ACT-2", "7", STATIONS, {
    type: "assign",
    station: "Station B",
  });
  assert.equal(result.ok, true);
});

test("the current status is none before anything is reported", async () => {
  const result = await stewardStatus("ACT-1", "7", STATIONS, {
    type: "current",
  });
  assert.deepEqual(result, { ok: true, own: null });
});

test("logging in again gives back the status the steward had", async () => {
  await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station B",
  });
  await stewardStatus("ACT-1", "7", STATIONS, { type: "arrive" });
  const result = await stewardStatus("ACT-1", "7", [], { type: "current" });
  assert.deepEqual(result, {
    ok: true,
    own: { station: "Station B", status: "MANNED" },
  });
});

test("another steward on the same phone does not inherit the status", async () => {
  await stewardStatus("ACT-1", "7", STATIONS, {
    type: "assign",
    station: "Station B",
  });
  const current = await stewardStatus("ACT-1", "8", STATIONS, {
    type: "current",
  });
  assert.deepEqual(current, { ok: true, own: null });
  const assign = await stewardStatus("ACT-1", "8", STATIONS, {
    type: "assign",
    station: "Station A",
  });
  assert.equal(assign.ok, true);
});

test("rejections are shown in Danish, with a fallback for unknown codes", () => {
  assert.equal(
    statusErrorMessage(INVALID_STATUS_TRANSITION),
    "Den status kan du ikke skifte til lige nu.",
  );
  assert.equal(
    statusErrorMessage("E9999"),
    "Din status blev ikke modtaget. Prøv igen.",
  );
});

const state = {
  activationId: "ACT-1",
  scenarioId: "DEMO-001",
  startedAt: "2026-11-03T08:00:00Z",
  status: "ACTIVE",
  actor: "1",
  sequence: 1,
  deployments: [
    { status: "UNMANNED", staff: null, fulfills: "Station A" },
    { status: "MANNED", staff: "8", fulfills: "Station B" },
  ],
};

test("without an own status the deployments are unchanged", () => {
  assert.equal(withOwnStatus(state, "7", null), state);
});

test("the own status takes an empty deployment at the station", () => {
  const result = withOwnStatus(state, "7", {
    station: "Station A",
    status: "PENDING",
  });
  assert.deepEqual(result.deployments[0], {
    status: "PENDING",
    staff: "7",
    fulfills: "Station A",
  });
  assert.equal(result.deployments.length, 2);
});

test("the own status is added when the station has no free deployment", () => {
  const result = withOwnStatus(state, "7", {
    station: "Station B",
    status: "PENDING",
  });
  assert.equal(result.deployments.length, 3);
  assert.deepEqual(result.deployments[2], {
    status: "PENDING",
    staff: "7",
    fulfills: "Station B",
  });
  // The other steward is left alone.
  assert.deepEqual(result.deployments[1], state.deployments[1]);
});

test("the steward's existing deployment is updated, not duplicated", () => {
  const mine = {
    ...state,
    deployments: [{ status: "PENDING", staff: 7, fulfills: "Station A" }],
  };
  const result = withOwnStatus(mine, "7", {
    station: "Station A",
    status: "MANNED",
  });
  assert.equal(result.deployments.length, 1);
  assert.equal(result.deployments[0].status, "MANNED");
});
