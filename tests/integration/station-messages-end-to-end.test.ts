import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { attachSocketHandlers } from "../../src/realtime/socket-server.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { createStationMessageQueueStore } from "../../shared/offline/station-message-queue.js";
import {
  isStationMessage,
  isStationMessageEvent,
  isStationMessageRequest,
  isStationThread,
  isStationThreadWithMessages,
  isStationThreadsClosed,
} from "../../shared/station-messages/validate.js";
import type {
  StationMessageEvent,
  StationThreadsClosed,
} from "../../shared/socket/events.js";
import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type { StationMessageRequest } from "../../shared/types/v1/station-message-request.js";
import type { StationThread } from "../../shared/types/v1/station-thread.js";
import { createStationMessageDelivery } from "../../mobile/src/offline/station-message-delivery.js";
import { seedTestScenarios, seededUser } from "./helpers.js";

// MET-A-029 (#338) end to end: the real Express API, Socket.IO server and
// PostgreSQL database, with the clients' shared validators and offline queue.
// The sender below stands in for mobile's deliverStationMessage, which imports
// expo-constants and cannot load in Node. stationMessageMobile.test.ts covers it.
const A004_TIMING_MS = 3000;
const STATION = "Station G";

const sql = getDatabase();
const sockets: Socket[] = [];

let server: HttpServer;
let baseUrl: string;
let operatorM3M4: { id: number; username: string };
let operatorM1M2: { id: number; username: string };
let steward1: { id: number; username: string };
let steward2: { id: number; username: string };

before(async () => {
  const usersA = await seedTestUsers("e2e-msg-a-");
  const usersB = await seedTestUsers("e2e-msg-b-");
  await seedTestScenarios();

  operatorM3M4 = seededUser(usersA, "OPERATOR", "M3_M4");
  operatorM1M2 = seededUser(usersA, "OPERATOR", "M1_M2");
  steward1 = seededUser(usersA, "STEWARD", "M3_M4");
  steward2 = seededUser(usersB, "STEWARD", "M3_M4");

  server = createServer(app);
  const io = new Server(server);
  app.locals.io = io;
  attachSocketHandlers(io);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  const io = app.locals.io as Server;
  delete app.locals.io;
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
});

async function login(
  username: string,
  password: string,
  client: "web" | "mobile",
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

function openSocket(token: string): Promise<Socket> {
  const socket = connect(baseUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(socket);
  return new Promise<Socket>((resolve, reject) => {
    socket.once("welcome", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function nextEvent<T>(socket: Socket, event: string, ms = A004_TIMING_MS) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      ms,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function recordEvents(socket: Socket, event: string) {
  const received: unknown[] = [];
  socket.on(event, (payload: unknown) => received.push(payload));
  return received;
}

function api(
  path: string,
  token: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function checkIn(token: string, activationId: number, station: string) {
  for (const event of ["EN_ROUTE", "ARRIVED"]) {
    const response = await api("/api/v1/position-reports", token, "POST", {
      activationId,
      staff: "",
      station,
      reportedAt: new Date().toISOString(),
      event,
    });
    assert.equal(response.status, 202);
  }
}

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: async (key: string) => {
      data.delete(key);
    },
  };
}

test("station messages work end to end across stewards, operators, offline queue and stand-down (MET-A-029, #338)", async (t) => {
  const opM3M4Token = await login(operatorM3M4.username, "operator123", "web");
  const opM1M2Token = await login(operatorM1M2.username, "operator123", "web");
  const steward1Token = await login(steward1.username, "steward123", "mobile");
  const steward2Token = await login(steward2.username, "steward123", "mobile");

  const opM3M4Socket = await openSocket(opM3M4Token);
  const opM1M2Socket = await openSocket(opM1M2Token);
  const steward1Socket = await openSocket(steward1Token);
  const steward2Socket = await openSocket(steward2Token);

  // Other line group's operator must never receive any events for M3/M4.
  const otherGroupMessages = recordEvents(opM1M2Socket, "station-message");
  const otherGroupClosed = recordEvents(opM1M2Socket, "station-threads-closed");

  const activateResponse = await api(
    "/api/v1/scenarios/DEMO-002/activate",
    opM3M4Token,
    "POST",
    {},
  );
  assert.equal(activateResponse.status, 201);
  const { activationId } = (await activateResponse.json()) as {
    activationId: number;
  };
  t.after(async () => {
    await api(
      `/api/v1/activations/${activationId}/stand-down`,
      opM3M4Token,
      "POST",
    );
  });

  // Steward 1 is not checked in yet: read and send are both refused with E1007.
  const notCheckedInRead = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}`,
    steward1Token,
  );
  assert.equal(notCheckedInRead.status, 409);
  assert.equal(
    ((await notCheckedInRead.json()) as { error: { code: string } }).error.code,
    "E1007",
  );

  // Steward 1 checks in at Station G.
  await checkIn(steward1Token, activationId, STATION);

  // 1. Steward 1 sends a message -> arrives at M3/M4 operator within A-004 timings
  //    as coming from the station, validated against the published schema.
  const stewardRequest: StationMessageRequest = {
    clientMessageId: randomUUID(),
    activationId,
    text: "Rulletrappen ved nordudgangen er stoppet.",
    writtenAt: new Date().toISOString(),
  };
  assert.equal(isStationMessageRequest(stewardRequest), true);
  assert.deepEqual(
    validate(stewardRequest, "station-message-request.schema.json"),
    [],
  );

  const opReceivesFirst = nextEvent<StationMessageEvent>(
    opM3M4Socket,
    "station-message",
  );
  const sentBefore = Date.now();
  const stewardSendResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}/messages`,
    steward1Token,
    "POST",
    stewardRequest,
  );
  assert.equal(stewardSendResponse.status, 201);
  const firstMessage = (await stewardSendResponse.json()) as StationMessage;
  assert.equal(isStationMessage(firstMessage), true);
  assert.deepEqual(validate(firstMessage, "station-message.schema.json"), []);
  assert.equal(firstMessage.sender, "STATION");
  assert.equal(firstMessage.station, STATION);

  const opFirstEvent = await opReceivesFirst;
  assert.ok(Date.now() - sentBefore < A004_TIMING_MS);
  assert.equal(isStationMessageEvent(opFirstEvent), true);
  assert.deepEqual(opFirstEvent.message, firstMessage);
  assert.equal(opFirstEvent.thread.state, "UNANSWERED");
  assert.deepEqual(opFirstEvent.thread.stationMessageIds, [firstMessage.id]);

  // Operator lists threads and sees the station thread validated against schema.
  const opListResponse = await api("/api/v1/station-threads", opM3M4Token);
  assert.equal(opListResponse.status, 200);
  const opThreads = (await opListResponse.json()) as StationThread[];
  assert.equal(opThreads.length, 1);
  assert.equal(isStationThread(opThreads[0]), true);
  assert.deepEqual(opThreads[0].stationMessageIds, [firstMessage.id]);
  assert.deepEqual(validate(opThreads[0], "station-thread.schema.json"), []);

  // 2. Operator replies -> arrives live at Steward 1 within A-004 timings.
  const operatorRequest: StationMessageRequest = {
    clientMessageId: randomUUID(),
    activationId,
    text: "Modtaget, vi sender en tekniker.",
    writtenAt: new Date().toISOString(),
  };
  assert.equal(isStationMessageRequest(operatorRequest), true);

  const steward1ReceivesReply = nextEvent<StationMessageEvent>(
    steward1Socket,
    "station-message",
  );
  const replySentBefore = Date.now();
  const replyResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}/messages`,
    opM3M4Token,
    "POST",
    operatorRequest,
  );
  assert.equal(replyResponse.status, 201);
  const replyMessage = (await replyResponse.json()) as StationMessage;
  assert.equal(isStationMessage(replyMessage), true);
  assert.deepEqual(validate(replyMessage, "station-message.schema.json"), []);
  assert.equal(replyMessage.sender, "CONTROL_ROOM");

  const stewardReplyEvent = await steward1ReceivesReply;
  assert.ok(Date.now() - replySentBefore < A004_TIMING_MS);
  assert.equal(isStationMessageEvent(stewardReplyEvent), true);
  assert.deepEqual(stewardReplyEvent.message, replyMessage);
  assert.equal(stewardReplyEvent.thread.state, "ANSWERED");

  // 3. A second steward checks in at the same station and reads the earlier messages;
  //    an operator in the other line group does not see the thread.
  await checkIn(steward2Token, activationId, STATION);

  const steward2ThreadResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}`,
    steward2Token,
  );
  assert.equal(steward2ThreadResponse.status, 200);
  const steward2Thread = (await steward2ThreadResponse.json()) as StationThread;
  assert.equal(isStationThreadWithMessages(steward2Thread), true);
  assert.deepEqual(validate(steward2Thread, "station-thread.schema.json"), []);
  assert.deepEqual(
    steward2Thread.messages?.map((m) => [m.sender, m.text]),
    [
      ["STATION", stewardRequest.text],
      ["CONTROL_ROOM", operatorRequest.text],
    ],
  );

  // Operator in M1/M2 sees no M3/M4 thread via list, detail, or post.
  const otherListResponse = await api("/api/v1/station-threads", opM1M2Token);
  assert.equal(otherListResponse.status, 200);
  assert.deepEqual(await otherListResponse.json(), []);

  const otherReadResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}`,
    opM1M2Token,
  );
  assert.equal(otherReadResponse.status, 409);
  assert.equal(
    ((await otherReadResponse.json()) as { error: { code: string } }).error
      .code,
    "E1001",
  );

  const otherPostResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}/messages`,
    opM1M2Token,
    "POST",
    {
      clientMessageId: randomUUID(),
      activationId,
      text: "Forkert linjegruppe",
      writtenAt: new Date().toISOString(),
    },
  );
  assert.equal(otherPostResponse.status, 409);

  // 4. Offline message queued with an earlier writtenAt arrives once after
  //    reconnection, preserving its original writtenAt.
  const queue = createStationMessageQueueStore(memoryStorage());
  const offlineWrittenAt = new Date(Date.now() - 120_000).toISOString();
  const offlineClientId = randomUUID();
  await queue.enqueue({
    clientMessageId: offlineClientId,
    userId: String(steward1.id),
    station: STATION,
    activationId,
    text: "Skrevet uden forbindelse i tunnelen.",
    writtenAt: offlineWrittenAt,
  });

  let online = false;
  const delivery = createStationMessageDelivery(
    queue,
    async (token, queued) => {
      if (!online) return { status: "retry" };
      const response = await api(
        `/api/v1/station-threads/${encodeURIComponent(queued.station)}/messages`,
        token,
        "POST",
        {
          clientMessageId: queued.clientMessageId,
          activationId: queued.activationId,
          text: queued.text,
          writtenAt: queued.writtenAt,
        },
      );
      if (response.status === 200 || response.status === 201) {
        const stored: unknown = await response.json();
        if (!isStationMessage(stored)) {
          return { status: "rejected", httpStatus: 422 };
        }
        return { status: "accepted", message: stored };
      }
      return { status: "retry" };
    },
  );

  // First flush while offline keeps the message pending.
  const blockedFlush = await delivery.flush(String(steward1.id), steward1Token);
  assert.equal(blockedFlush.blocked, true);
  assert.equal(blockedFlush.pending, 1);

  // Reconnect: flush delivers it once; a duplicate HTTP retry with the same
  // clientMessageId returns 200 and emits no second socket event.
  const opOfflineEvents = recordEvents(opM3M4Socket, "station-message");
  const steward2OfflineEvents = recordEvents(steward2Socket, "station-message");
  const opReceivesOffline = nextEvent<StationMessageEvent>(
    opM3M4Socket,
    "station-message",
  );
  const steward2ReceivesOffline = nextEvent<StationMessageEvent>(
    steward2Socket,
    "station-message",
  );

  online = true;
  const deliveredFlush = await delivery.flush(
    String(steward1.id),
    steward1Token,
  );
  assert.equal(deliveredFlush.blocked, false);
  assert.equal(deliveredFlush.pending, 0);
  assert.equal(deliveredFlush.delivered.length, 1);
  const offlineStored = deliveredFlush.delivered[0];
  assert.equal(offlineStored.writtenAt, offlineWrittenAt);
  assert.ok(
    Date.parse(offlineStored.receivedAt) > Date.parse(offlineWrittenAt),
  );

  // Replay the exact same payload as if the first response were lost.
  const duplicateRetry = await api(
    `/api/v1/station-threads/${encodeURIComponent(STATION)}/messages`,
    steward1Token,
    "POST",
    {
      clientMessageId: offlineClientId,
      activationId,
      text: "Skrevet uden forbindelse i tunnelen.",
      writtenAt: offlineWrittenAt,
    },
  );
  assert.equal(duplicateRetry.status, 200);
  assert.deepEqual(await duplicateRetry.json(), offlineStored);

  const opOfflineEvent = await opReceivesOffline;
  const steward2OfflineEvent = await steward2ReceivesOffline;
  assert.equal(opOfflineEvent.message.writtenAt, offlineWrittenAt);
  assert.equal(steward2OfflineEvent.message.writtenAt, offlineWrittenAt);
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(opOfflineEvents.length, 1);
  assert.equal(steward2OfflineEvents.length, 1);

  // 5. Stand-down closes threads for both clients, and every message is in the
  //    incident log with text and both timestamps and without steward identity.
  const opClosedPromise = nextEvent<StationThreadsClosed>(
    opM3M4Socket,
    "station-threads-closed",
  );
  const steward1ClosedPromise = nextEvent<StationThreadsClosed>(
    steward1Socket,
    "station-threads-closed",
  );
  const steward2ClosedPromise = nextEvent<StationThreadsClosed>(
    steward2Socket,
    "station-threads-closed",
  );

  const standDownResponse = await api(
    `/api/v1/activations/${activationId}/stand-down`,
    opM3M4Token,
    "POST",
  );
  assert.equal(standDownResponse.status, 200);

  for (const closedEvent of await Promise.all([
    opClosedPromise,
    steward1ClosedPromise,
    steward2ClosedPromise,
  ])) {
    assert.equal(isStationThreadsClosed(closedEvent), true);
    assert.equal(closedEvent.activationId, activationId);
  }

  // Threads are gone from the HTTP API after stand-down.
  assert.deepEqual(
    await (await api("/api/v1/station-threads", opM3M4Token)).json(),
    [],
  );
  assert.equal(
    (
      await api(
        `/api/v1/station-threads/${encodeURIComponent(STATION)}`,
        steward1Token,
      )
    ).status,
    409,
  );

  // Other line group's operator never received any socket events throughout.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual(otherGroupMessages, []);
  assert.deepEqual(otherGroupClosed, []);

  // Incident log contains all three messages with text, both timestamps, and no steward identity.
  const logged = await sql<
    {
      actorType: string;
      actorId: string;
      actorRole: string | null;
      subjectId: string;
      payload: Record<string, unknown>;
      clientTime: Date | null;
      serverTime: Date;
    }[]
  >`
    SELECT actor_type, actor_id, actor_role, subject_id, payload, client_time, server_time
    FROM incident_events
    WHERE activation_id = ${String(activationId)}
      AND type = 'STATION_MESSAGE_WRITTEN'
    ORDER BY sequence
  `;

  assert.equal(logged.length, 3);
  const expectedMessages = [firstMessage, replyMessage, offlineStored];
  for (let i = 0; i < expectedMessages.length; i++) {
    const row = logged[i];
    const stored = expectedMessages[i];
    assert.equal(row.actorType, "SYSTEM");
    assert.equal(row.actorId, "station-thread");
    assert.equal(row.actorRole, null);
    assert.equal(row.subjectId, String(stored.id));
    assert.equal(row.payload.station, STATION);
    assert.equal(row.payload.text, stored.text);
    assert.equal(row.payload.writtenAt, stored.writtenAt);
    assert.equal(row.payload.receivedAt, stored.receivedAt);
    assert.equal(row.clientTime?.toISOString(), stored.writtenAt);
    assert.ok(row.serverTime instanceof Date);
    const serialized = JSON.stringify(row);
    assert.equal(serialized.includes(steward1.username), false);
    assert.equal(serialized.includes(steward2.username), false);
    assert.equal("staff" in row.payload, false);
    assert.equal("userId" in row.payload, false);
    assert.equal("clientMessageId" in row.payload, false);
  }
});
