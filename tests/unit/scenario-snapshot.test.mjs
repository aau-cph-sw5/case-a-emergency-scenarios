import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  STALE_AFTER_MS,
  ageInMinutes,
  buildSnapshot,
  createSnapshotStore,
  formatSyncTime,
  isStale,
} from "../../shared/offline/scenario-snapshot.ts";

const fixture = (path) =>
  JSON.parse(
    readFileSync(new URL(`../../fixtures/v1/${path}`, import.meta.url)),
  );

const state = fixture("scenario-state.json");
const scenario = fixture("scenarios/DEMO-001.json");
const now = new Date(2026, 9, 16, 14, 32);

// An in-memory stand-in for AsyncStorage.
function memoryStorage() {
  const items = new Map();
  return {
    items,
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

const active = { active: true, state, scenario };

test("keeps only the current version, without the operating plan", () => {
  const withOldVersion = {
    ...scenario,
    versions: [
      ...scenario.versions,
      { ...scenario.versions[0], version: "0", revision: "Old" },
    ],
  };

  const snapshot = buildSnapshot(
    { ...active, scenario: withOldVersion },
    "steward-test",
    now,
  );

  assert.equal(snapshot.scenario.versions.length, 1);
  assert.equal(snapshot.scenario.versions[0].version, scenario.currentVersion);
  assert.equal("operatingPlan" in snapshot.scenario.versions[0], false);
  assert.deepEqual(
    snapshot.scenario.versions[0].stationRequirements,
    scenario.versions[0].stationRequirements,
  );
  assert.equal(snapshot.savedAt, now.toISOString());
  assert.equal(snapshot.userId, "steward-test");
  assert.deepEqual(snapshot.state, state);
});

test("a scenario without its current version keeps no versions", () => {
  const withoutCurrent = { ...scenario, currentVersion: "99" };

  const snapshot = buildSnapshot(
    { ...active, scenario: withoutCurrent },
    "steward-test",
    now,
  );

  assert.deepEqual(snapshot.scenario.versions, []);
});

test("a copy with a malformed station requirement counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);
  snapshot.scenario.versions[0].stationRequirements = [
    { station: "Station B", actions: {} },
  ];

  await storage.setItem("met-a-005/active-scenario", JSON.stringify(snapshot));
  assert.equal(await store.load(), null);
});

test("saves, loads and clears the copy", async () => {
  const store = createSnapshotStore(memoryStorage());
  const snapshot = buildSnapshot(active, "steward-test", now);

  await store.save(snapshot);
  assert.deepEqual(await store.load("steward-test"), snapshot);
  assert.deepEqual(await store.load(), snapshot);

  await store.clear();
  assert.equal(await store.load(), null);
});

test("another steward's copy counts as no copy", async () => {
  const store = createSnapshotStore(memoryStorage());
  await store.save(buildSnapshot(active, "steward-test", now));

  assert.equal(await store.load("someone-else"), null);
});

test("a damaged copy counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);

  await storage.setItem("met-a-005/active-scenario", "{not json");
  assert.equal(await store.load(), null);

  await storage.setItem("met-a-005/active-scenario", JSON.stringify({}));
  assert.equal(await store.load(), null);
});

test("a copy becomes stale after 60 minutes", () => {
  const savedAt = now.toISOString();
  const later = (ms) => new Date(now.getTime() + ms);

  assert.equal(STALE_AFTER_MS, 60 * 60 * 1000);
  assert.equal(isStale(savedAt, later(STALE_AFTER_MS)), false);
  assert.equal(isStale(savedAt, later(STALE_AFTER_MS + 1)), true);
  assert.equal(ageInMinutes(savedAt, later(75 * 60 * 1000)), 75);
});

test("formats the sync time as HH:MM, with the date when not today", () => {
  assert.equal(formatSyncTime(now.toISOString(), now), "14:32");
  assert.equal(
    formatSyncTime(new Date(2026, 9, 16, 7, 5).toISOString(), now),
    "07:05",
  );
  assert.equal(
    formatSyncTime(new Date(2026, 9, 15, 23, 50).toISOString(), now),
    "15/10 23:50",
  );
});
