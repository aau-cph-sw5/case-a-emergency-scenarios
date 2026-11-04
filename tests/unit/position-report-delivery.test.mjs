import test from "node:test";
import assert from "node:assert/strict";

import { createPositionReportQueueStore } from "../../shared/offline/position-report-queue.ts";

import { createPositionReportDelivery } from "../../mobile/src/offline/position-report-delivery.ts";

// Temporary storage with the same methods as AsyncStorage.
// Each test creates its own storage so tests remain independent.
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

// Creates a sample queued report with a predictable ID.
function aReport(id = "report-1") {
  return {
    id,
    userId: "steward-1",
    station: "Station B",
    reportedAt: "2026-11-03T10:00:00Z",
    scenarioId: "DEMO-001",
    activationId: 1,
  };
}

// An accepted report must be removed from the queue.
test("acknowledges a report only after successful delivery", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);

  const sent = [];

  const delivery = createPositionReportDelivery(queue, async (token, item) => {
    sent.push({ token, report: item });
    return { status: "accepted" };
  });

  const result = await delivery.flush("steward-1", "test-token");

  assert.deepEqual(sent, [{ token: "test-token", report }]);

  assert.equal(result.acknowledged, 1);
  assert.equal(result.pending, 0);
  assert.deepEqual(await queue.getPending("steward-1"), []);
});

// A failed connection must not lose the report.
test("keeps a report queued when delivery needs retry", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);

  const delivery = createPositionReportDelivery(queue, async () => ({
    status: "retry",
  }));

  const result = await delivery.flush("steward-1", "test-token");

  assert.equal(result.acknowledged, 0);
  assert.equal(result.pending, 1);
  assert.deepEqual(result.blockedBy, { status: "retry" });

  assert.deepEqual(await queue.getPending("steward-1"), [report]);
});

// A rejected report must not be acknowledged as delivered.
test("keeps a report queued when the server rejects it", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);

  const delivery = createPositionReportDelivery(queue, async () => ({
    status: "rejected",
    httpStatus: 409,
  }));

  const result = await delivery.flush("steward-1", "test-token");

  assert.equal(result.acknowledged, 0);
  assert.equal(result.pending, 1);

  assert.deepEqual(result.blockedBy, {
    status: "rejected",
    httpStatus: 409,
  });

  assert.deepEqual(await queue.getPending("steward-1"), [report]);
});

// Flushing a second time must not resend an acknowledged report.
test("replaying the queue twice does not resend acknowledged reports", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);

  let sendCount = 0;

  const delivery = createPositionReportDelivery(queue, async () => {
    sendCount++;
    return { status: "accepted" };
  });

  const first = await delivery.flush("steward-1", "test-token");
  const second = await delivery.flush("steward-1", "test-token");

  assert.equal(first.acknowledged, 1);
  assert.equal(second.acknowledged, 0);

  assert.equal(sendCount, 1);
  assert.equal(second.pending, 0);
  assert.deepEqual(await queue.getPending("steward-1"), []);
});

// Reports must be processed in order.
// A failed report stops delivery of later reports.
test("stops at the first failed report and keeps remaining reports", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());

  const firstReport = aReport("report-1");
  const secondReport = aReport("report-2");
  const thirdReport = aReport("report-3");

  await queue.enqueue(firstReport);
  await queue.enqueue(secondReport);
  await queue.enqueue(thirdReport);

  const sentIds = [];

  const delivery = createPositionReportDelivery(
    queue,
    async (_token, report) => {
      sentIds.push(report.id);

      if (report.id === "report-2") {
        return { status: "retry" };
      }

      return { status: "accepted" };
    },
  );

  const result = await delivery.flush("steward-1", "test-token");

  // Report 3 must not be attempted after report 2 fails.
  assert.deepEqual(sentIds, ["report-1", "report-2"]);

  assert.equal(result.acknowledged, 1);
  assert.equal(result.pending, 2);

  assert.deepEqual(await queue.getPending("steward-1"), [
    secondReport,
    thirdReport,
  ]);
});

test("concurrent flushes do not send the same report twice", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());
  const report = aReport();

  await queue.enqueue(report);

  let sendCount = 0;
  let finishDelivery;

  // This promise lets the test control when delivery finishes.
  const deliveryGate = new Promise((resolve) => {
    finishDelivery = resolve;
  });

  const delivery = createPositionReportDelivery(queue, async () => {
    sendCount++;

    // Keep the first delivery in progress.
    await deliveryGate;

    return { status: "accepted" };
  });

  // Start two flushes without waiting for the first to finish.
  const firstFlush = delivery.flush("steward-1", "test-token");
  const secondFlush = delivery.flush("steward-1", "test-token");

  // Allow the simulated HTTP delivery to finish.
  finishDelivery();

  const [first, second] = await Promise.all([firstFlush, secondFlush]);

  // Both callers share one delivery operation.
  assert.equal(sendCount, 1);

  assert.equal(first.acknowledged, 1);
  assert.equal(second.acknowledged, 1);

  assert.deepEqual(await queue.getPending("steward-1"), []);
});

test("different users can flush their own queues independently", async () => {
  const queue = createPositionReportQueueStore(memoryStorage());

  const reportA = aReport("report-a");
  const reportB = {
    ...aReport("report-b"),
    userId: "steward-2",
  };

  await queue.enqueue(reportA);
  await queue.enqueue(reportB);

  const sent = [];

  const delivery = createPositionReportDelivery(
    queue,
    async (token, report) => {
      sent.push({
        token,
        userId: report.userId,
        id: report.id,
      });

      return { status: "accepted" };
    },
  );

  // Start both flushes without awaiting either one first.
  const [resultA, resultB] = await Promise.all([
    delivery.flush("steward-1", "token-1"),
    delivery.flush("steward-2", "token-2"),
  ]);

  assert.deepEqual(sent, [
    {
      token: "token-1",
      userId: "steward-1",
      id: "report-a",
    },
    {
      token: "token-2",
      userId: "steward-2",
      id: "report-b",
    },
  ]);

  assert.equal(resultA.acknowledged, 1);
  assert.equal(resultB.acknowledged, 1);

  assert.deepEqual(await queue.getPending("steward-1"), []);
  assert.deepEqual(await queue.getPending("steward-2"), []);
});
