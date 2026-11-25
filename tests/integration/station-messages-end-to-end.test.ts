import "dotenv/config";
import test, { after, before, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDatabase } from "../../src/db/client.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { createStationMessageQueueStore } from "../../shared/offline/station-message-queue.js";
import { createStationMessageDeliverer } from "../../shared/station-messages/deliver.js";
import {
  isStationMessage,
  isStationMessageEvent,
  isStationMessageRequest,
  isStationThreadSummary,
  isStationThreadWithMessages,
  isStationThreadsClosed,
  type StationThreadWithMessages,
} from "../../shared/station-messages/validate.js";
import type {
  StationMessageEvent,
  StationThreadsClosed,
} from "../../shared/socket/events.js";
import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request.js";
import { createStationMessageDelivery } from "../../mobile/src/offline/station-message-delivery.js";
import { seedTestScenarios, seededUser } from "./helpers.js";
import {
  api,
  assertError,
  checkIn,
  login,
  memoryStorage,
  nextEvent,
  recordEvents,
  settle,
  startTestServer,
  type TestServerHandle,
} from "./http-socket-helpers.js";

const sql = getDatabase();
const STATION = "Station C";
const ENCODED_STATION = encodeURIComponent(STATION);
const SCENARIO = "DEMO-003";

let server: TestServerHandle;
let operatorM1M2Token: string;
let steward1Token: string;
let steward2Token: string;
let adminToken: string;
let operatorM3M4Token: string;
let stewardM3M4Token: string;
let steward1Id: number;
let steward2Id: number;

function assertValidMessage(value: unknown): asserts value is StationMessage {
  assert.deepEqual(validate(value, "station-message.schema.json"), []);
  if (!isStationMessage(value)) {
    assert.fail("Expected a valid StationMessage");
  }
  assert.equal("staff" in value, false);
  assert.equal("userId" in value, false);
  assert.equal("username" in value, false);
}

function assertValidThreadWithMessages(
  value: unknown,
): asserts value is StationThreadWithMessages {
  assert.deepEqual(validate(value, "station-thread.schema.json"), []);
  if (!isStationThreadWithMessages(value)) {
    assert.fail("Expected a valid StationThreadWithMessages");
  }
}

function assertValidMessageEvent(
  value: unknown,
): asserts value is StationMessageEvent {
  if (!isStationMessageEvent(value)) {
    assert.fail("Expected a valid StationMessageEvent");
  }
  assertValidMessage(value.message);
  assert.deepEqual(validate(value.thread, "station-thread.schema.json"), []);
}

function postMessage(
  token: string,
  body: StationMessageRequest,
  station = ENCODED_STATION,
) {
  return api(
    server.baseUrl,
    `/api/v1/station-threads/${station}/messages`,
    token,
    "POST",
    body,
  );
}

before(async () => {
  const groupA = await seedTestUsers("e2e-sm-a-");
  const groupB = await seedTestUsers("e2e-sm-b-");
  await seedTestScenarios();

  steward1Id = seededUser(groupA, "STEWARD", "M1_M2").id;
  steward2Id = seededUser(groupB, "STEWARD", "M1_M2").id;
  server = await startTestServer();

  operatorM1M2Token = await login(
    server.baseUrl,
    seededUser(groupA, "OPERATOR", "M1_M2").username,
    "operator123",
    "web",
  );
  steward1Token = await login(
    server.baseUrl,
    seededUser(groupA, "STEWARD", "M1_M2").username,
    "steward123",
    "mobile",
  );
  steward2Token = await login(
    server.baseUrl,
    seededUser(groupB, "STEWARD", "M1_M2").username,
    "steward123",
    "mobile",
  );
  adminToken = await login(
    server.baseUrl,
    seededUser(groupA, "ADMIN", "M1_M2").username,
    "admin123",
    "web",
  );
  operatorM3M4Token = await login(
    server.baseUrl,
    seededUser(groupA, "OPERATOR", "M3_M4").username,
    "operator123",
    "web",
  );
  stewardM3M4Token = await login(
    server.baseUrl,
    seededUser(groupA, "STEWARD", "M3_M4").username,
    "steward123",
    "mobile",
  );
});

after(async () => {
  await server.close();
  await sql.end();
});

test("station-message endpoints enforce role permissions (MET-A-029)", async () => {
  await assertError(
    await api(server.baseUrl, "/api/v1/station-threads", adminToken),
    403,
    "E0002",
  );
  await assertError(
    await api(
      server.baseUrl,
      `/api/v1/station-threads/${ENCODED_STATION}`,
      adminToken,
    ),
    403,
    "E0002",
  );
  await assertError(
    await postMessage(adminToken, {
      clientMessageId: randomUUID(),
      activationId: 1,
      text: "Admin må ikke skrive",
      writtenAt: new Date().toISOString(),
    }),
    403,
    "E0002",
  );
  await assertError(
    await api(server.baseUrl, "/api/v1/station-threads", steward1Token),
    403,
    "E0002",
  );
});

test("station messages work end to end across stewards, operators, line groups, offline queue, stand-down, and incident log (MET-A-029, #338)", async (t: TestContext) => {
  const activateRes = await api(
    server.baseUrl,
    `/api/v1/scenarios/${SCENARIO}/activate`,
    operatorM1M2Token,
    "POST",
    {},
  );
  assert.equal(activateRes.status, 201);
  const { activationId } = (await activateRes.json()) as {
    activationId: number;
  };
  t.after(async () => {
    await api(
      server.baseUrl,
      `/api/v1/activations/${activationId}/stand-down`,
      operatorM1M2Token,
      "POST",
    );
  });

  const operatorM1M2Socket = await server.openSocket(operatorM1M2Token);
  const operatorM3M4Socket = await server.openSocket(operatorM3M4Token);
  const steward1Socket = await server.openSocket(steward1Token);
  const steward2Socket = await server.openSocket(steward2Token);
  const stewardM3M4Socket = await server.openSocket(stewardM3M4Token);

  const leakedToM3M4Operator = recordEvents(
    operatorM3M4Socket,
    "station-message",
  );
  const leakedToM3M4Steward = recordEvents(
    stewardM3M4Socket,
    "station-message",
  );
  const leakedClosedToM3M4 = recordEvents(
    operatorM3M4Socket,
    "station-threads-closed",
  );

  let msg1!: StationMessage;
  let reply1!: StationMessage;
  let reply2!: StationMessage;
  let offlineDelivered!: StationMessage;

  await t.test(
    "checked-in steward sends a message to same-line-group operator only",
    async () => {
      await assertError(
        await api(
          server.baseUrl,
          `/api/v1/station-threads/${ENCODED_STATION}`,
          steward1Token,
        ),
        409,
        "E1007",
      );

      await checkIn(server.baseUrl, steward1Token, activationId, STATION);

      const request: StationMessageRequest = {
        clientMessageId: randomUUID(),
        activationId,
        text: "Elevatoren ved nordudgangen står stille.",
        writtenAt: new Date().toISOString(),
      };
      assert.equal(isStationMessageRequest(request), true);

      const operatorSeesMsg1 = nextEvent<StationMessageEvent>(
        operatorM1M2Socket,
        "station-message",
      );
      const sentAt = Date.now();
      const response = await postMessage(steward1Token, request);
      assert.equal(response.status, 201);
      const body: unknown = await response.json();
      assertValidMessage(body);
      assert.equal(body.sender, "STATION");
      assert.equal(body.station, STATION);
      msg1 = body;

      const event = await operatorSeesMsg1;
      assert.ok(Date.now() - sentAt < 3000);
      assertValidMessageEvent(event);
      assert.deepEqual(event.message, msg1);
      assert.equal(event.thread.state, "UNANSWERED");
      assert.deepEqual(event.thread.stationMessageIds, [msg1.id]);

      const listRes = await api(
        server.baseUrl,
        "/api/v1/station-threads",
        operatorM1M2Token,
      );
      assert.equal(listRes.status, 200);
      const threads: unknown = await listRes.json();
      assert.ok(Array.isArray(threads));
      assert.equal(threads.length, 1);
      assert.deepEqual(validate(threads[0], "station-thread.schema.json"), []);
      assert.equal(isStationThreadSummary(threads[0]), true);

      // Other line group is isolated on both list and station endpoints.
      const otherListRes = await api(
        server.baseUrl,
        "/api/v1/station-threads",
        operatorM3M4Token,
      );
      assert.equal(otherListRes.status, 200);
      assert.deepEqual(await otherListRes.json(), []);

      await assertError(
        await api(
          server.baseUrl,
          `/api/v1/station-threads/${ENCODED_STATION}`,
          operatorM3M4Token,
        ),
        409,
        "E1001",
      );
      await assertError(
        await postMessage(operatorM3M4Token, {
          clientMessageId: randomUUID(),
          activationId,
          text: "Forkert linjegruppe",
          writtenAt: new Date().toISOString(),
        }),
        409,
        "E1001",
      );
    },
  );

  await t.test(
    "operator reply reaches checked-in steward and not an unchecked-in steward",
    async () => {
      const steward2BeforeCheckIn = recordEvents(
        steward2Socket,
        "station-message",
      );
      try {
        const steward1SeesReply = nextEvent<StationMessageEvent>(
          steward1Socket,
          "station-message",
        );
        const sentAt = Date.now();
        const response = await postMessage(operatorM1M2Token, {
          clientMessageId: randomUUID(),
          activationId,
          text: "Tekniker er tilkaldt.",
          writtenAt: new Date().toISOString(),
        });
        assert.equal(response.status, 201);
        const body: unknown = await response.json();
        assertValidMessage(body);
        assert.equal(body.sender, "CONTROL_ROOM");
        reply1 = body;

        const event = await steward1SeesReply;
        assert.ok(Date.now() - sentAt < 3000);
        assertValidMessageEvent(event);
        assert.deepEqual(event.message, reply1);
        assert.equal(event.thread.state, "ANSWERED");

        await settle();
        assert.deepEqual(steward2BeforeCheckIn.received, []);
      } finally {
        steward2BeforeCheckIn.stop();
      }
    },
  );

  await t.test(
    "second steward checking in later sees earlier messages and receives live replies",
    async () => {
      await assertError(
        await api(
          server.baseUrl,
          `/api/v1/station-threads/${ENCODED_STATION}`,
          steward2Token,
        ),
        409,
        "E1007",
      );

      await checkIn(server.baseUrl, steward2Token, activationId, STATION);

      const threadRes = await api(
        server.baseUrl,
        `/api/v1/station-threads/${ENCODED_STATION}`,
        steward2Token,
      );
      assert.equal(threadRes.status, 200);
      const thread: unknown = await threadRes.json();
      assertValidThreadWithMessages(thread);
      assert.deepEqual(
        thread.messages.map((message) => message.id),
        [msg1.id, reply1.id],
      );

      const steward1SeesReply2 = nextEvent<StationMessageEvent>(
        steward1Socket,
        "station-message",
      );
      const steward2SeesReply2 = nextEvent<StationMessageEvent>(
        steward2Socket,
        "station-message",
      );
      const reply2Res = await postMessage(operatorM1M2Token, {
        clientMessageId: randomUUID(),
        activationId,
        text: "Tekniker ankommer om 10 minutter.",
        writtenAt: new Date().toISOString(),
      });
      assert.equal(reply2Res.status, 201);
      const body: unknown = await reply2Res.json();
      assertValidMessage(body);
      reply2 = body;

      assert.equal((await steward1SeesReply2).message.id, reply2.id);
      assert.equal((await steward2SeesReply2).message.id, reply2.id);
    },
  );

  const queueStore = createStationMessageQueueStore(memoryStorage());
  const delivery = createStationMessageDelivery(
    queueStore,
    createStationMessageDeliverer(server.baseUrl),
  );

  await t.test(
    "offline queued message delivers once via real mobile transport with original writtenAt",
    async () => {
      const offlineWrittenAt = new Date(
        Date.parse(reply1.writtenAt) - 120_000,
      ).toISOString();
      const offlineId = randomUUID();
      const offlineText = "Skrevet uden forbindelse før kontrolrummets svar.";

      await queueStore.enqueue({
        clientMessageId: offlineId,
        userId: String(steward1Id),
        station: STATION,
        activationId,
        text: offlineText,
        writtenAt: offlineWrittenAt,
      });

      const operatorSeesOffline = nextEvent<StationMessageEvent>(
        operatorM1M2Socket,
        "station-message",
      );
      const flushResult = await delivery.flush(
        String(steward1Id),
        steward1Token,
      );
      assert.equal(flushResult.delivered.length, 1);
      assert.equal(flushResult.rejected, 0);
      assert.equal(flushResult.pending, 0);

      offlineDelivered = flushResult.delivered[0];
      assertValidMessage(offlineDelivered);
      assert.equal(offlineDelivered.writtenAt, offlineWrittenAt);
      assert.equal(offlineDelivered.text, offlineText);
      assert.equal(offlineDelivered.sender, "STATION");

      const offlineEvent = await operatorSeesOffline;
      assertValidMessageEvent(offlineEvent);
      assert.equal(offlineEvent.message.id, offlineDelivered.id);
      assert.equal(offlineEvent.message.writtenAt, offlineWrittenAt);
      assert.equal(offlineEvent.thread.state, "UNANSWERED");

      // Replay returns 200 without emitting a second socket event.
      const replayEvents = recordEvents(operatorM1M2Socket, "station-message");
      try {
        const replayBody: StationMessageRequest = {
          clientMessageId: offlineId,
          activationId,
          text: offlineText,
          writtenAt: offlineWrittenAt,
        };
        const replayRes = await postMessage(steward1Token, replayBody);
        assert.equal(replayRes.status, 200);
        assert.deepEqual(await replayRes.json(), offlineDelivered);
        await settle();
        assert.deepEqual(replayEvents.received, []);

        // Cross-role and cross-line-group replays are refused with 409 E0007.
        await assertError(
          await postMessage(operatorM1M2Token, replayBody),
          409,
          "E0007",
        );
        await assertError(
          await postMessage(stewardM3M4Token, replayBody),
          409,
          "E0007",
        );
      } finally {
        replayEvents.stop();
      }

      const fullThreadRes = await api(
        server.baseUrl,
        `/api/v1/station-threads/${ENCODED_STATION}`,
        operatorM1M2Token,
      );
      assert.equal(fullThreadRes.status, 200);
      const fullThread: unknown = await fullThreadRes.json();
      assertValidThreadWithMessages(fullThread);
      assert.equal(fullThread.state, "UNANSWERED");
      assert.deepEqual(
        fullThread.messages.map((message) => message.id),
        [msg1.id, reply1.id, reply2.id, offlineDelivered.id],
      );
      assert.equal(fullThread.messages.at(-1)?.writtenAt, offlineWrittenAt);
    },
  );

  await t.test(
    "stand-down closes threads, rejects post-stand-down offline queue, and preserves incident log",
    async () => {
      const operatorClosed = nextEvent<StationThreadsClosed>(
        operatorM1M2Socket,
        "station-threads-closed",
      );
      const steward1Closed = nextEvent<StationThreadsClosed>(
        steward1Socket,
        "station-threads-closed",
      );
      const steward2Closed = nextEvent<StationThreadsClosed>(
        steward2Socket,
        "station-threads-closed",
      );

      const standDownRes = await api(
        server.baseUrl,
        `/api/v1/activations/${activationId}/stand-down`,
        operatorM1M2Token,
        "POST",
      );
      assert.equal(standDownRes.status, 200);

      for (const closedEvent of await Promise.all([
        operatorClosed,
        steward1Closed,
        steward2Closed,
      ])) {
        assert.equal(isStationThreadsClosed(closedEvent), true);
        assert.equal(closedEvent.activationId, activationId);
      }

      const afterStandDownList = await api(
        server.baseUrl,
        "/api/v1/station-threads",
        operatorM1M2Token,
      );
      assert.equal(afterStandDownList.status, 200);
      assert.deepEqual(await afterStandDownList.json(), []);

      await assertError(
        await api(
          server.baseUrl,
          `/api/v1/station-threads/${ENCODED_STATION}`,
          steward1Token,
        ),
        409,
        "E1001",
      );

      // A message queued offline for the stood-down activation is rejected by the real mobile deliverer.
      const lateOfflineId = randomUUID();
      await queueStore.enqueue({
        clientMessageId: lateOfflineId,
        userId: String(steward1Id),
        station: STATION,
        activationId,
        text: "For sent efter stand-down",
        writtenAt: new Date().toISOString(),
      });
      const lateFlush = await delivery.flush(String(steward1Id), steward1Token);
      assert.equal(lateFlush.delivered.length, 0);
      assert.equal(lateFlush.rejected, 1);
      assert.equal(lateFlush.pending, 0);
      const rejected = await queueStore.getRejected(String(steward1Id));
      assert.equal(rejected.length, 1);
      assert.equal(rejected[0].clientMessageId, lateOfflineId);
      assert.equal(rejected[0].rejection.httpStatus, 409);
      assert.equal(rejected[0].rejection.code, "E1003");

      const logged = await sql<
        {
          schemaVersion: number;
          actorType: string;
          actorId: string;
          actorRole: string | null;
          subjectId: string;
          payload: Record<string, unknown>;
        }[]
      >`
        SELECT schema_version, actor_type, actor_id, actor_role, subject_id, payload
        FROM incident_events
        WHERE type = 'STATION_MESSAGE_WRITTEN'
          AND activation_id = ${String(activationId)}
        ORDER BY sequence
      `;

      const expectedMessages = [msg1, reply1, reply2, offlineDelivered];
      assert.equal(logged.length, expectedMessages.length);

      for (let i = 0; i < expectedMessages.length; i++) {
        const event = logged[i];
        const message = expectedMessages[i];
        assert.equal(event.schemaVersion, 2);
        assert.equal(event.actorType, "SYSTEM");
        assert.equal(event.actorId, "station-thread");
        assert.equal(event.actorRole, null);
        assert.notEqual(event.actorId, String(steward1Id));
        assert.notEqual(event.actorId, String(steward2Id));
        assert.equal(event.subjectId, String(message.id));
        assert.deepEqual(event.payload, {
          station: STATION,
          sender: message.sender,
          text: message.text,
          writtenAt: message.writtenAt,
          receivedAt: message.receivedAt,
        });
        assert.equal("clientMessageId" in event.payload, false);
        assert.equal("staff" in event.payload, false);
        assert.equal("userId" in event.payload, false);
      }

      await settle();
      assert.deepEqual(leakedToM3M4Operator.received, []);
      assert.deepEqual(leakedToM3M4Steward.received, []);
      assert.deepEqual(leakedClosedToM3M4.received, []);
    },
  );
});
