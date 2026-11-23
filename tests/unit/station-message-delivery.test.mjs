import test from "node:test";
import assert from "node:assert/strict";

import { createStationMessageQueueStore } from "../../shared/offline/station-message-queue.ts";
import {
  createStationMessageDelivery,
  isUnauthorized,
} from "../../mobile/src/offline/station-message-delivery.ts";

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

function aMessage(clientMessageId = "message-1", userId = "steward-1") {
  return {
    clientMessageId,
    userId,
    station: "Station B",
    activationId: 1,
    text: "Vi mangler folk ved udgangen",
    writtenAt: "2026-11-15T20:00:00Z",
  };
}

// What the server answers when it stores a message.
function stored(message, id = 1) {
  return {
    status: "accepted",
    message: {
      id,
      clientMessageId: message.clientMessageId,
      activationId: message.activationId,
      station: message.station,
      sender: "STATION",
      text: message.text,
      writtenAt: message.writtenAt,
      receivedAt: "2026-11-15T20:05:00Z",
    },
  };
}

async function queued(messages) {
  const queue = createStationMessageQueueStore(memoryStorage());
  for (const message of messages) await queue.enqueue(message);
  return queue;
}

test("sends a queued message and removes it once the server has it", async () => {
  const message = aMessage();
  const queue = await queued([message]);
  const sent = [];
  const delivery = createStationMessageDelivery(queue, async (token, item) => {
    sent.push({ token, item });
    return stored(item);
  });

  const result = await delivery.flush("steward-1", "test-token");

  assert.deepEqual(sent, [{ token: "test-token", item: message }]);
  assert.deepEqual(result.delivered, [stored(message).message]);
  assert.equal(result.pending, 0);
  assert.equal(result.blocked, false);
  assert.deepEqual(await queue.getPending("steward-1"), []);
});

test("sends the original time written, also when it is sent later", async () => {
  const queue = await queued([aMessage()]);
  let writtenAt;
  const delivery = createStationMessageDelivery(queue, async (_, item) => {
    writtenAt = item.writtenAt;
    return stored(item);
  });
  await delivery.flush("steward-1", "test-token");
  assert.equal(writtenAt, "2026-11-15T20:00:00Z");
});

test("sends each message once over two flushes", async () => {
  const queue = await queued([aMessage()]);
  let sends = 0;
  const delivery = createStationMessageDelivery(queue, async (_, item) => {
    sends++;
    return stored(item);
  });
  await delivery.flush("steward-1", "test-token");
  await delivery.flush("steward-1", "test-token");
  assert.equal(sends, 1);
});

test("does not send a message twice when two flushes start at once", async () => {
  const queue = await queued([aMessage()]);
  let sends = 0;
  const delivery = createStationMessageDelivery(queue, async (_, item) => {
    sends++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return stored(item);
  });
  await Promise.all([
    delivery.flush("steward-1", "test-token"),
    delivery.flush("steward-1", "test-token"),
    delivery.flush("steward-1", "test-token"),
  ]);
  assert.equal(sends, 1);
});

test("keeps the message queued when there is no connection", async () => {
  const queue = await queued([aMessage()]);
  const delivery = createStationMessageDelivery(queue, async () => ({
    status: "retry",
  }));
  const result = await delivery.flush("steward-1", "test-token");
  assert.equal(result.blocked, true);
  assert.equal(result.pending, 1);
  assert.deepEqual(await queue.getRejected("steward-1"), []);
});

test("stops at a message that must wait, so later ones keep their order", async () => {
  const queue = await queued([aMessage("first"), aMessage("second")]);
  const sent = [];
  const delivery = createStationMessageDelivery(queue, async (_, item) => {
    sent.push(item.clientMessageId);
    return { status: "retry" };
  });
  await delivery.flush("steward-1", "test-token");
  assert.deepEqual(sent, ["first"]);
});

test("marks a message as not sent when the steward has checked out, and does not retry it", async () => {
  const queue = await queued([aMessage()]);
  let sends = 0;
  const delivery = createStationMessageDelivery(queue, async () => {
    sends++;
    return { status: "rejected", httpStatus: 409, code: "E1007" };
  });

  const result = await delivery.flush("steward-1", "test-token");
  await delivery.flush("steward-1", "test-token");

  assert.equal(sends, 1);
  assert.equal(result.rejected, 1);
  assert.equal(result.blocked, false);
  assert.deepEqual(await queue.getRejected("steward-1"), [
    { ...aMessage(), rejection: { httpStatus: 409, code: "E1007" } },
  ]);
});

test("marks a message as not sent when the scenario was stood down", async () => {
  const queue = await queued([aMessage()]);
  const delivery = createStationMessageDelivery(queue, async () => ({
    status: "rejected",
    httpStatus: 409,
    code: "E1003",
  }));
  await delivery.flush("steward-1", "test-token");
  const [rejected] = await queue.getRejected("steward-1");
  assert.equal(rejected.rejection.code, "E1003");
});

test("goes on with the next message after a refused one", async () => {
  const first = aMessage("first");
  const second = aMessage("second");
  const queue = await queued([first, second]);
  const delivery = createStationMessageDelivery(queue, async (_, item) =>
    item.clientMessageId === "first"
      ? { status: "rejected", httpStatus: 409, code: "E1007" }
      : stored(item),
  );
  const result = await delivery.flush("steward-1", "test-token");
  assert.equal(result.rejected, 1);
  assert.deepEqual(
    result.delivered.map((message) => message.clientMessageId),
    ["second"],
  );
});

for (const httpStatus of [401, 403, 408, 429]) {
  test(`keeps the message queued after HTTP ${httpStatus}`, async () => {
    const queue = await queued([aMessage()]);
    const delivery = createStationMessageDelivery(queue, async () => ({
      status: "rejected",
      httpStatus,
    }));
    const result = await delivery.flush("steward-1", "test-token");
    assert.equal(result.blocked, true);
    assert.deepEqual(result.blockedBy, { status: "rejected", httpStatus });
    assert.equal(result.pending, 1);
    assert.deepEqual(await queue.getRejected("steward-1"), []);
  });
}

test("reports a 401 stop through blockedBy and isUnauthorized (MET-A-029, #445)", async () => {
  const queue = await queued([aMessage("first"), aMessage("second")]);
  let sends = 0;
  const delivery = createStationMessageDelivery(queue, async () => {
    sends++;
    return { status: "rejected", httpStatus: 401, code: "E2001" };
  });

  const result = await delivery.flush("steward-1", "test-token");

  assert.equal(sends, 1);
  assert.equal(result.blocked, true);
  assert.deepEqual(result.blockedBy, {
    status: "rejected",
    httpStatus: 401,
    code: "E2001",
  });
  assert.equal(result.pending, 2);
  assert.equal(isUnauthorized(result), true);
  assert.deepEqual(await queue.getRejected("steward-1"), []);
});

test("isUnauthorized is true only when blockedBy is HTTP 401", () => {
  assert.equal(
    isUnauthorized({
      delivered: [],
      rejected: 0,
      pending: 1,
      blocked: true,
      blockedBy: { status: "rejected", httpStatus: 401 },
    }),
    true,
  );
  assert.equal(
    isUnauthorized({
      delivered: [],
      rejected: 0,
      pending: 1,
      blocked: true,
      blockedBy: { status: "retry" },
    }),
    false,
  );
  assert.equal(
    isUnauthorized({
      delivered: [],
      rejected: 0,
      pending: 1,
      blocked: true,
      blockedBy: { status: "rejected", httpStatus: 403 },
    }),
    false,
  );
  assert.equal(
    isUnauthorized({
      delivered: [],
      rejected: 0,
      pending: 0,
      blocked: false,
    }),
    false,
  );
});

test("only sends the signed-in steward's messages", async () => {
  const queue = await queued([
    aMessage("mine", "steward-1"),
    aMessage("theirs", "steward-2"),
  ]);
  const sent = [];
  const delivery = createStationMessageDelivery(queue, async (_, item) => {
    sent.push(item.clientMessageId);
    return stored(item);
  });
  await delivery.flush("steward-1", "test-token");
  assert.deepEqual(sent, ["mine"]);
  assert.equal((await queue.getPending("steward-2")).length, 1);
});
