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

test("keeps lineGroup and current version operating-plan patterns while omitting excluded fields", () => {
  const withPatternsAndOldVersion = {
    ...scenario,
    versions: [
      {
        ...scenario.versions[0],
        operatingPlan: {
          name: "Fallback operation",
          patterns: [
            {
              operationType: "PENDULUM",
              routeCode: "A-B",
              trackNumber: 1,
              maximumTrains: 2,
              did: "DEMO-1",
              description: "Synthetic pendulum service",
              route: [
                { sequence: 1, station: "Station A" },
                { sequence: 2, station: "Station B" },
              ],
              color: "#FF080B",
            },
            {
              operationType: "ROUNDTRIP",
              routeCode: "B-C",
              trackNumber: 12,
              maximumTrains: 3,
              did: "DEMO-2",
              description: "Synthetic roundtrip service",
              route: [{ sequence: 1, station: "Station B" }],
            },
          ],
        },
      },
      { ...scenario.versions[0], version: "0", revision: "Old" },
    ],
  };

  const snapshot = buildSnapshot(
    { ...active, scenario: withPatternsAndOldVersion },
    "steward-test",
    now,
  );

  assert.equal(snapshot.scenario.lineGroup, scenario.lineGroup);
  assert.equal(snapshot.scenario.versions.length, 1);
  const [version] = snapshot.scenario.versions;
  assert.equal(version.version, scenario.currentVersion);
  assert.equal("revision" in version, false);
  assert.equal("name" in version.operatingPlan, false);
  assert.deepEqual(version.operatingPlan.patterns, [
    {
      operationType: "PENDULUM",
      routeCode: "A-B",
      trackNumber: 1,
      did: "DEMO-1",
      route: [
        { sequence: 1, station: "Station A" },
        { sequence: 2, station: "Station B" },
      ],
      color: "#FF080B",
    },
    {
      operationType: "ROUNDTRIP",
      routeCode: "B-C",
      trackNumber: 12,
      did: "DEMO-2",
      route: [{ sequence: 1, station: "Station B" }],
    },
  ]);
  for (const pattern of version.operatingPlan.patterns) {
    assert.equal("maximumTrains" in pattern, false);
    assert.equal("description" in pattern, false);
  }
  assert.equal("color" in version.operatingPlan.patterns[1], false);
  assert.deepEqual(
    version.stationRequirements,
    scenario.versions[0].stationRequirements,
  );
  assert.equal(snapshot.savedAt, now.toISOString());
  assert.equal(snapshot.userId, "steward-test");
  assert.deepEqual(snapshot.state, state);
});

test("reloads a valid copy with patterns both with and without color", async () => {
  const store = createSnapshotStore(memoryStorage());
  const withTwoPatterns = {
    ...scenario,
    versions: [
      {
        ...scenario.versions[0],
        operatingPlan: {
          name: "Fallback operation",
          patterns: [
            {
              operationType: "PENDULUM",
              routeCode: "A-B",
              trackNumber: 1,
              maximumTrains: 1,
              did: "DEMO-1",
              route: [
                { sequence: 1, station: "Station A" },
                { sequence: 2, station: "Station B" },
              ],
              color: "#FF080B",
            },
            {
              operationType: "ROUNDTRIP",
              routeCode: "B-C",
              trackNumber: 12,
              maximumTrains: 2,
              did: "DEMO-2",
              route: [],
            },
          ],
        },
      },
    ],
  };
  const snapshot = buildSnapshot(
    { ...active, scenario: withTwoPatterns },
    "steward-test",
    now,
  );

  await store.save(snapshot);
  assert.deepEqual(await store.load("steward-test"), snapshot);
});

test("a legacy copy without lineGroup or with an invalid lineGroup counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);

  const withoutLineGroup = structuredClone(snapshot);
  delete withoutLineGroup.scenario.lineGroup;
  await storage.setItem(STORAGE_KEY, JSON.stringify(withoutLineGroup));
  assert.equal(await store.load("steward-test"), null);

  const invalidLineGroup = structuredClone(snapshot);
  invalidLineGroup.scenario.lineGroup = "M5";
  await storage.setItem(STORAGE_KEY, JSON.stringify(invalidLineGroup));
  assert.equal(await store.load("steward-test"), null);
});

test("a legacy copy without operatingPlan or operatingPlan.patterns counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);

  const withoutOperatingPlan = structuredClone(snapshot);
  delete withoutOperatingPlan.scenario.versions[0].operatingPlan;
  await storage.setItem(STORAGE_KEY, JSON.stringify(withoutOperatingPlan));
  assert.equal(await store.load("steward-test"), null);

  const withoutPatterns = structuredClone(snapshot);
  withoutPatterns.scenario.versions[0].operatingPlan = {};
  await storage.setItem(STORAGE_KEY, JSON.stringify(withoutPatterns));
  assert.equal(await store.load("steward-test"), null);
});

test("a copy with a malformed operating-plan pattern counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const base = buildSnapshot(active, "steward-test", now);
  const validPattern = base.scenario.versions[0].operatingPlan.patterns[0];
  const malformedPatterns = [
    null,
    { ...validPattern, operationType: "SHUTTLE" },
    { ...validPattern, routeCode: 123 },
    { ...validPattern, trackNumber: 1.5 },
    { ...validPattern, did: null },
    { ...validPattern, route: "A-B" },
    { ...validPattern, route: ["Station A"] },
    { ...validPattern, route: [[]] },
    { ...validPattern, color: "red" },
    { ...validPattern, color: "#FFF" },
    { ...validPattern, color: 123 },
  ];

  for (const malformed of malformedPatterns) {
    const broken = structuredClone(base);
    broken.scenario.versions[0].operatingPlan.patterns = [malformed];
    await storage.setItem(STORAGE_KEY, JSON.stringify(broken));
    assert.equal(
      await store.load("steward-test"),
      null,
      `Expected malformed pattern to be rejected: ${JSON.stringify(malformed)}`,
    );
  }
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

test("a copy with a malformed track segment counts as no copy", async () => {
  const storage = memoryStorage();
  const store = createSnapshotStore(storage);
  const snapshot = buildSnapshot(active, "steward-test", now);
  snapshot.scenario.covers = [{ stationA: "Station A", stationB: "Station B" }];

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
