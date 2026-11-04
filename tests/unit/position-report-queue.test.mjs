import test from "node:test";
import assert from "node:assert/strict";

import { createPositionReportQueueStore } from "../../shared/offline/position-report-queue.ts";

// Creates temporary storage that behaves like AsyncStorage.
// Each Map is independent, so tests cannot affect one another.
function memoryStorage() {
  const items = new Map();

  return {
    getItem: async (key) => items.get(key) ?? null,

    setItem: async (key, value) => {
      items.set(key, value);
    },

    removeItem: async (key) => {
      items.delete(key);
    },
  };
}

// Creates a predictable report for queue testing.
// These tests do not require real UUIDs because no HTTP
// schema validation is involved.
function aReport(id = "report-1") {
  return {
    id,
    userId: "steward-1",
    station: "Station B",
    reportedAt: "2026-11-01T12:00:00Z",
    scenarioId: "DEMO-001",
    activationId: "activation-1",
  };
}

test("stores a position report", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);

  assert.deepEqual(await queue.getPending("steward-1"), [report]);
});

test("queued reports survive creating a new store instance", async () => {
  const storage = memoryStorage();

  const beforeRestart = createPositionReportQueueStore(storage);
  const report = aReport();

  await beforeRestart.enqueue(report);

  // A fresh store instance reads the same persistent storage.
  const afterRestart = createPositionReportQueueStore(storage);

  assert.deepEqual(await afterRestart.getPending("steward-1"), [report]);
});

test("acknowledging a report removes only that report", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());

  await queue.enqueue(aReport("report-1"));
  await queue.enqueue(aReport("report-2"));

  await queue.acknowledge("steward-1", "report-1");

  assert.deepEqual(await queue.getPending("steward-1"), [aReport("report-2")]);
});

test("enqueueing the same report twice does not duplicate it", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);
  await queue.enqueue(report);

  assert.equal((await queue.getPending("steward-1")).length, 1);
});

test("different reports are not lost during concurrent enqueue", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());

  await Promise.all([
    queue.enqueue(aReport("report-1")),
    queue.enqueue(aReport("report-2")),
  ]);

  assert.equal((await queue.getPending("steward-1")).length, 2);
});

test("one user's reports are not shown to another user", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());

  await queue.enqueue(aReport());

  assert.deepEqual(await queue.getPending("steward-2"), []);
});
