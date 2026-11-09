import test from "node:test";
import assert from "node:assert/strict";
import { createPositionReportQueueStore } from "../../shared/offline/position-report-queue.ts";
import { createPositionReportDelivery } from "../../mobile/src/offline/position-report-delivery.ts";

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

function aReport(id = "report-1", userId = "steward-1") {
  return {
    id,
    userId,
    station: "Station B",
    reportedAt: "2026-11-03T10:00:00Z",
    scenarioId: "DEMO-001",
    activationId: 1,
  };
}

async function queued(reports, storage = memoryStorage()) {
  const queue = createPositionReportQueueStore(storage);
  for (const report of reports) await queue.enqueue(report);
  return queue;
}

const accepted = { status: "accepted" };

test("acknowledges a report only after successful delivery", async () => {
  const report = aReport();
  const queue = await queued([report]);
  const sent = [];
  const delivery = createPositionReportDelivery(queue, async (token, item) => {
    sent.push({ token, report: item });
    return accepted;
  });
  const result = await delivery.flush("steward-1", "test-token");
  assert.deepEqual(sent, [{ token: "test-token", report }]);
  assert.equal(result.acknowledged, 1);
  assert.equal(result.rejected, 0);
  assert.equal(result.pending, 0);
  assert.deepEqual(await queue.getPending("steward-1"), []);
});

test("keeps a report queued when delivery needs retry", async () => {
  const report = aReport();
  const queue = await queued([report]);
  const delivery = createPositionReportDelivery(queue, async () => ({
    status: "retry",
  }));
  const result = await delivery.flush("steward-1", "test-token");
  assert.equal(result.acknowledged, 0);
  assert.equal(result.rejected, 0);
  assert.equal(result.pending, 1);
  assert.deepEqual(result.blockedBy, { status: "retry" });
  assert.deepEqual(await queue.getPending("steward-1"), [report]);
});

test("permanently rejected report is retained for review but does not block later reports", async () => {
  const first = aReport("report-a");
  const second = aReport("report-b");
  const storage = memoryStorage();
  const queue = await queued([first, second], storage);
  const sent = [];
  const delivery = createPositionReportDelivery(
    queue,
    async (_token, report) => {
      sent.push(report.id);
      return report.id === first.id
        ? { status: "rejected", httpStatus: 413 }
        : accepted;
    },
  );
  const result = await delivery.flush("steward-1", "test-token");
  assert.deepEqual(sent, [first.id, second.id]);
  assert.equal(result.acknowledged, 1);
  assert.equal(result.rejected, 1);
  assert.equal(result.pending, 0);
  assert.equal(result.blockedBy, undefined);
  assert.deepEqual(await queue.getPending("steward-1"), []);
  const restored = createPositionReportQueueStore(storage);
  const expectedRejected = [{ ...first, rejection: { httpStatus: 413 } }];
  assert.deepEqual(await restored.getRejected("steward-1"), expectedRejected);
  await restored.enqueue(first);
  assert.deepEqual(await restored.getRejected("steward-1"), expectedRejected);
  assert.deepEqual(await restored.getPending("steward-1"), []);
  await delivery.flush("steward-1", "test-token");
  assert.deepEqual(sent, [first.id, second.id]);
});

test("authentication and rate-limit rejections remain pending", async () => {
  for (const httpStatus of [401, 403, 408, 429, 500]) {
    const report = aReport();
    const queue = await queued([report]);
    const delivery = createPositionReportDelivery(queue, async () => ({
      status: "rejected",
      httpStatus,
    }));
    const result = await delivery.flush("steward-1", "test-token");
    assert.equal(result.rejected, 0);
    assert.equal(result.pending, 1);
    assert.equal(result.blockedBy.httpStatus, httpStatus);
    assert.deepEqual(await queue.getPending("steward-1"), [report]);
    assert.deepEqual(await queue.getRejected("steward-1"), []);
  }
});

test("replaying the queue twice does not resend acknowledged reports", async () => {
  const queue = await queued([aReport()]);
  let sendCount = 0;
  const delivery = createPositionReportDelivery(queue, async () => {
    sendCount++;
    return accepted;
  });
  const first = await delivery.flush("steward-1", "test-token");
  const second = await delivery.flush("steward-1", "test-token");
  assert.equal(first.acknowledged, 1);
  assert.equal(second.acknowledged, 0);
  assert.equal(sendCount, 1);
  assert.equal(second.pending, 0);
});

test("stops at the first retryable failure and keeps later reports", async () => {
  const reports = [
    aReport("report-1"),
    aReport("report-2"),
    aReport("report-3"),
  ];
  const queue = await queued(reports);
  const sent = [];
  const delivery = createPositionReportDelivery(
    queue,
    async (_token, report) => {
      sent.push(report.id);
      return report.id === "report-2" ? { status: "retry" } : accepted;
    },
  );
  const result = await delivery.flush("steward-1", "test-token");
  assert.deepEqual(sent, ["report-1", "report-2"]);
  assert.equal(result.acknowledged, 1);
  assert.equal(result.pending, 2);
  assert.deepEqual(await queue.getPending("steward-1"), reports.slice(1));
});

test("concurrent flushes do not send the same report twice", async () => {
  const queue = await queued([aReport()]);
  let sendCount = 0;
  let finishDelivery;
  const deliveryGate = new Promise((resolve) => {
    finishDelivery = resolve;
  });
  const delivery = createPositionReportDelivery(queue, async () => {
    sendCount++;
    await deliveryGate;
    return accepted;
  });
  const firstFlush = delivery.flush("steward-1", "test-token");
  const secondFlush = delivery.flush("steward-1", "test-token");
  finishDelivery();
  const [first, second] = await Promise.all([firstFlush, secondFlush]);
  assert.equal(sendCount, 1);
  assert.equal(first.acknowledged, 1);
  assert.equal(second.acknowledged, 1);
  assert.deepEqual(await queue.getPending("steward-1"), []);
});

test("different users flush and retain rejections independently", async () => {
  const queue = await queued([
    aReport("report-a"),
    aReport("report-b", "steward-2"),
  ]);
  const sent = [];
  const delivery = createPositionReportDelivery(
    queue,
    async (token, report) => {
      sent.push({ token, userId: report.userId, id: report.id });
      return report.userId === "steward-1"
        ? { status: "rejected", httpStatus: 409, code: "E1006" }
        : accepted;
    },
  );
  const [a, b] = await Promise.all([
    delivery.flush("steward-1", "token-1"),
    delivery.flush("steward-2", "token-2"),
  ]);
  assert.deepEqual(sent, [
    { token: "token-1", userId: "steward-1", id: "report-a" },
    { token: "token-2", userId: "steward-2", id: "report-b" },
  ]);
  assert.equal(a.rejected, 1);
  assert.equal(b.acknowledged, 1);
  assert.equal((await queue.getRejected("steward-1")).length, 1);
  assert.deepEqual(await queue.getRejected("steward-2"), []);
  assert.deepEqual(await queue.getPending("steward-1"), []);
  assert.deepEqual(await queue.getPending("steward-2"), []);
});

test("replays offline steward events in order with original timestamps", async () => {
  const reports = [
    {
      ...aReport("assign"),
      event: "EN_ROUTE",
      reportedAt: "2026-11-05T12:01:00Z",
    },
    {
      ...aReport("arrive"),
      event: "ARRIVED",
      reportedAt: "2026-11-05T12:04:00Z",
    },
    {
      ...aReport("checkout"),
      event: "CHECKED_OUT",
      reportedAt: "2026-11-05T12:15:00Z",
    },
  ];
  const storage = memoryStorage();
  await queued(reports, storage);
  const restoredQueue = createPositionReportQueueStore(storage);
  const delivered = [];
  const delivery = createPositionReportDelivery(
    restoredQueue,
    async (_token, report) => {
      delivered.push(report);
      return accepted;
    },
  );
  const result = await delivery.flush("steward-1", "test-token");
  assert.deepEqual(delivered, reports);
  assert.equal(result.acknowledged, 3);
  assert.equal(result.pending, 0);
  assert.deepEqual(await restoredQueue.getPending("steward-1"), []);
});
