import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CLOCK_TOLERANCE_MS,
  STALE_AFTER_MS,
  STORAGE_KEY,
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

test("a scenario without its current version is never made a copy", () => {
  const withoutCurrent = { ...scenario, currentVersion: "99" };

  assert.throws(
    () => buildSnapshot({ ...active, scenario: withoutCurrent }, "x", now),
    /without its current version/,
  );
});

test("a copy without its version counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);

  await storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...snapshot,
      scenario: { ...snapshot.scenario, versions: [] },
    }),
  );

  assert.equal(await store.load("steward-test"), null);
});

test("a copy with a malformed station requirement counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);
  snapshot.scenario.versions[0].stationRequirements = [
    { station: "Station B", actions: {} },
  ];

  await storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  assert.equal(await store.load("steward-test"), null);
});

test("a copy with malformed passenger information counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);
  snapshot.scenario.versions[0].passengerInformation = [
    { channel: "PA", language: "da", message: { text: "Toget kører ikke." } },
  ];

  await storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  assert.equal(await store.load("steward-test"), null);
});

test("saves, loads and clears the copy", async () => {
  const store = createSnapshotStore(memoryStorage());
  const snapshot = buildSnapshot(active, "steward-test", now);

  await store.save(snapshot);
  assert.deepEqual(await store.load("steward-test"), snapshot);

  await store.clear();
  assert.equal(await store.load("steward-test"), null);
});

test("another steward's copy counts as no copy", async () => {
  const store = createSnapshotStore(memoryStorage());
  await store.save(buildSnapshot(active, "steward-test", now));

  assert.equal(await store.load("someone-else"), null);
});

test("a damaged copy counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);

  await storage.setItem(STORAGE_KEY, "{not json");
  assert.equal(await store.load("steward-test"), null);

  await storage.setItem(STORAGE_KEY, JSON.stringify({}));
  assert.equal(await store.load("steward-test"), null);
});

test("a copy becomes stale after 60 minutes", () => {
  const savedAt = now.toISOString();
  const later = (ms) => new Date(now.getTime() + ms);

  assert.equal(STALE_AFTER_MS, 60 * 60 * 1000);
  assert.equal(isStale(savedAt, later(STALE_AFTER_MS)), false);
  assert.equal(isStale(savedAt, later(STALE_AFTER_MS + 1)), true);
  assert.equal(ageInMinutes(savedAt, later(75 * 60 * 1000)), 75);
});

test("a copy from the future is stale with an unknown age", () => {
  const savedAt = now.toISOString();
  const earlier = (ms) => new Date(now.getTime() - ms);

  assert.equal(CLOCK_TOLERANCE_MS, 2 * 60 * 1000);
  // Within the tolerance the copy counts as just saved.
  assert.equal(isStale(savedAt, earlier(CLOCK_TOLERANCE_MS)), false);
  assert.equal(ageInMinutes(savedAt, earlier(CLOCK_TOLERANCE_MS)), 0);
  // Beyond it the clock was turned back, so the age is unknown.
  assert.equal(isStale(savedAt, earlier(CLOCK_TOLERANCE_MS + 1)), true);
  assert.equal(ageInMinutes(savedAt, earlier(CLOCK_TOLERANCE_MS + 1)), null);
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

test("writes land in the order they were made, also when the storage finishes them out of order", async () => {
  const items = new Map();
  const finished = [];
  // The first write takes longer than the ones after it.
  const delays = [30, 0, 0];
  const storage = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: (key, value) =>
      new Promise((resolve) =>
        setTimeout(() => {
          items.set(key, value);
          finished.push("save");
          resolve();
        }, delays.shift() ?? 0),
      ),
    removeItem: (key) =>
      new Promise((resolve) =>
        setTimeout(() => {
          items.delete(key);
          finished.push("clear");
          resolve();
        }, delays.shift() ?? 0),
      ),
  };
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);

  const writes = [store.save(snapshot), store.clear()];
  assert.equal(await store.load("steward-test"), null);
  await Promise.all(writes);

  assert.deepEqual(finished, ["save", "clear"]);
  assert.equal(await store.load("steward-test"), null);
});

test("a failed write does not stop the next one", async () => {
  const storage = memoryStorage();
  const failing = {
    ...storage,
    setItem: async () => {
      throw new Error("disk full");
    },
  };
  const store = createSnapshotStore(failing);

  await assert.rejects(
    store.save(buildSnapshot(active, "steward-test", now)),
    /disk full/,
  );
  await storage.setItem(STORAGE_KEY, "{}");
  await store.clear();
  assert.equal(storage.items.has(STORAGE_KEY), false);
});
