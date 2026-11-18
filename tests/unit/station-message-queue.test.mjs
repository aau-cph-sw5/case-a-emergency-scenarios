import test from "node:test";
import assert from "node:assert/strict";

import {
  STATION_MESSAGE_QUEUE_KEY,
  createStationMessageQueueStore,
} from "../../shared/offline/station-message-queue.ts";

// Storage that behaves like AsyncStorage. Each test gets its own.
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

test("keeps a written message as pending", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  assert.deepEqual(await queue.getPending("steward-1"), [aMessage()]);
  assert.deepEqual(await queue.getRejected("steward-1"), []);
});

test("keeps the time the message was written", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  const [pending] = await queue.getPending("steward-1");
  assert.equal(pending.writtenAt, "2026-11-15T20:00:00Z");
});

test("keeps the order the messages were written in", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage("first"));
  await queue.enqueue(aMessage("second"));
  const ids = (await queue.getPending("steward-1")).map(
    (message) => message.clientMessageId,
  );
  assert.deepEqual(ids, ["first", "second"]);
});

test("stores the same message once when it is added twice", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  await queue.enqueue(aMessage());
  assert.equal((await queue.getPending("steward-1")).length, 1);
});

test("refuses a message id reused for a different text", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  await assert.rejects(
    queue.enqueue({ ...aMessage(), text: "Noget andet" }),
    /already used/,
  );
});

test("forgets a message once the server has it", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  await queue.acknowledge("steward-1", "message-1");
  assert.deepEqual(await queue.getPending("steward-1"), []);
});

test("keeps a refused message as not sent, with the reason", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  await queue.reject("steward-1", "message-1", {
    httpStatus: 409,
    code: "E1007",
  });
  assert.deepEqual(await queue.getPending("steward-1"), []);
  assert.deepEqual(await queue.getRejected("steward-1"), [
    { ...aMessage(), rejection: { httpStatus: 409, code: "E1007" } },
  ]);
});

test("keeps the first reason when a message is refused twice", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  await queue.reject("steward-1", "message-1", {
    httpStatus: 409,
    code: "E1003",
  });
  await queue.reject("steward-1", "message-1", {
    httpStatus: 409,
    code: "E1007",
  });
  const [rejected] = await queue.getRejected("steward-1");
  assert.equal(rejected.rejection.code, "E1003");
});

test("refusing a message that is not queued fails", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await assert.rejects(
    queue.reject("steward-1", "missing", { httpStatus: 409 }),
    /not found/,
  );
});

test("only shows a steward their own messages", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage("mine", "steward-1"));
  await queue.enqueue(aMessage("theirs", "steward-2"));
  const ids = (await queue.getPending("steward-1")).map(
    (message) => message.clientMessageId,
  );
  assert.deepEqual(ids, ["mine"]);
});

test("survives the app restarting, since the queue is in storage", async () => {
  const storage = memoryStorage();
  await createStationMessageQueueStore(storage).enqueue(aMessage());
  const reopened = createStationMessageQueueStore(storage);
  assert.deepEqual(await reopened.getPending("steward-1"), [aMessage()]);
});

test("changes made without waiting are all kept", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await Promise.all([
    queue.enqueue(aMessage("a")),
    queue.enqueue(aMessage("b")),
    queue.enqueue(aMessage("c")),
  ]);
  assert.equal((await queue.getPending("steward-1")).length, 3);
});

test("starts over when the stored text is not readable", async () => {
  const storage = memoryStorage();
  await storage.setItem(STATION_MESSAGE_QUEUE_KEY, "{not json");
  const queue = createStationMessageQueueStore(storage);
  assert.deepEqual(await queue.getPending("steward-1"), []);
  await queue.enqueue(aMessage());
  assert.equal((await queue.getPending("steward-1")).length, 1);
});

test("skips broken entries and keeps the valid ones", async () => {
  const storage = memoryStorage();
  await storage.setItem(
    STATION_MESSAGE_QUEUE_KEY,
    JSON.stringify([
      aMessage("good"),
      { ...aMessage("no-time"), writtenAt: "not a date" },
      { ...aMessage("bad-activation"), activationId: 0 },
      "not a message",
    ]),
  );
  const queue = createStationMessageQueueStore(storage);
  const ids = (await queue.getPending("steward-1")).map(
    (message) => message.clientMessageId,
  );
  assert.deepEqual(ids, ["good"]);
});

test("forgets refused messages of an activation that has ended", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue({ ...aMessage("old"), activationId: 1 });
  await queue.enqueue({ ...aMessage("current"), activationId: 2 });
  await queue.reject("steward-1", "old", { httpStatus: 409, code: "E1003" });
  await queue.reject("steward-1", "current", {
    httpStatus: 409,
    code: "E1007",
  });

  await queue.discardEndedRejections("steward-1", 2);

  const ids = (await queue.getRejected("steward-1")).map(
    (message) => message.clientMessageId,
  );
  assert.deepEqual(ids, ["current"]);
});

test("forgets every refused message when no scenario is live", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage());
  await queue.reject("steward-1", "message-1", { httpStatus: 409 });
  await queue.discardEndedRejections("steward-1", null);
  assert.deepEqual(await queue.getRejected("steward-1"), []);
});

test("never forgets a message that is still waiting to be sent", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue({ ...aMessage(), activationId: 1 });
  await queue.discardEndedRejections("steward-1", 2);
  assert.equal((await queue.getPending("steward-1")).length, 1);
});

test("leaves another steward's refused messages alone", async () => {
  const queue = createStationMessageQueueStore(memoryStorage());
  await queue.enqueue(aMessage("theirs", "steward-2"));
  await queue.reject("steward-2", "theirs", { httpStatus: 409 });
  await queue.discardEndedRejections("steward-1", null);
  assert.equal((await queue.getRejected("steward-2")).length, 1);
});
