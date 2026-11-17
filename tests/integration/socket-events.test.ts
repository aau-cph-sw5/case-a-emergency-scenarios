import test, { after, before, mock } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { authSessionRepository } from "../../src/repositories/auth-session-repository.js";
import {
  attachSocketHandlers,
  userRoom,
} from "../../src/realtime/socket-server.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { seedTestScenarios, seededUser } from "./helpers.js";
import { randomUUID } from "node:crypto";
import { emitStationMessage } from "../../src/realtime/station-messages.js";
import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type {
  StationMessageEvent,
  StationThreadsClosed,
} from "../../shared/socket/events.js";
import { response } from "express";
import type { LineGroup } from "../../shared/auth/line-groups.js";

let server: HttpServer;
let baseUrl: string;
let operatorUsername: string;
let stewardUsername: string;
let otherOperatorUsername: string;
let otherStewardUsername: string;
let stewardId: number;
let secondStewardName: string;
const sockets: Socket[] = [];

before(async () => {
  const users = await seedTestUsers("socket-");
  await seedTestScenarios();
  operatorUsername = seededUser(users, "OPERATOR", "M3_M4").username;
  stewardUsername = seededUser(users, "STEWARD", "M3_M4").username;
  otherOperatorUsername = seededUser(users, "OPERATOR", "M1_M2").username;
  otherStewardUsername = seededUser(users, "STEWARD", "M1_M2").username;
  stewardId = seededUser(users, "STEWARD", "M3_M4").id;
  const moreUsers = await seedTestUsers("socket-b-");
  secondStewardName = seededUser(moreUsers, "STEWARD", "M3_M4").username;

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
  await getDatabase().end();
});

async function login(
  username: string,
  password: string,
  client: "web" | "mobile",
) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return ((await response.json()) as { token: string }).token;
}

// Resolves with the connected socket, or rejects with connect_error.
function open(token?: string) {
  const socket = connect(baseUrl, {
    auth: token ? { token } : {},
    transports: ["websocket"],
    reconnection: false,
  });
  sockets.push(socket);
  return new Promise<Socket>((resolve, reject) => {
    socket.once("welcome", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 100));
function nextEvent<T>(socket: Socket, event: string, ms = 2000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event ${event}`)),
      ms,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function record(socket: Socket, event: string) {
  const got: unknown[] = [];
  socket.on(event, (payload: unknown) => got.push(payload));
  return got;
}
async function activateScenario(
  token: string,
  scenarioId = "DEMO-002",
  replaces?: number,
) {
  const response = await fetch(
    `${baseUrl}/api/v1/scenarios/${scenarioId}/activate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(replaces === undefined ? {} : { replaces }),
    },
  );
  assert.equal(response.status, 201);
  return ((await response.json()) as { activationId: number }).activationId;
}
async function standDownScenario(token: string, activationId: number) {
  const response = await fetch(
    `${baseUrl}/api/v1/activations/${activationId}/stand-down`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(response.status, 200);
}
async function reportAtG(
  token: string,
  activationId: number,
  event?: string,
  station = "Station G",
) {
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      activationId,
      staff: "",
      station,
      event,
      reportedAt: new Date().toISOString(),
    }),
  });
  assert.equal(response.status, 202);
}

async function checkInAtG(
  token: string,
  activationId: number,
  station = "Station G",
) {
  await reportAtG(token, activationId, undefined, station);
  await reportAtG(token, activationId, "ARRIVED", station);
}

function sendFakeMessage(
  activationId: number,
  lineGroup: LineGroup = "M3_M4",
  station = "Station G",
) {
  const now = new Date().toISOString();
  const message: StationMessage = {
    id: 1,
    clientMessageId: randomUUID(),
    activationId,
    station,
    sender: "CONTROL_ROOM",
    text: "Test message",
    writtenAt: now,
    receivedAt: now,
  };
  emitStationMessage(app.locals.io as Server, lineGroup, message, {
    activationId,
    station,
    state: "ANSWERED",
    unansweredSince: null,
    lastMessageAt: now,
  });
  return message;
}

test("a socket without a valid token is refused with E0001", async () => {
  await assert.rejects(open(), { message: "E0001" });
  await assert.rejects(open("not-a-token"), { message: "E0001" });
});

test("a user room targets only that user and a new login disconnects the old session", async () => {
  const oldToken = await login(stewardUsername, "steward123", "mobile");
  const steward = await open(oldToken);
  const operator = await open(
    await login(operatorUsername, "operator123", "web"),
  );
  let operatorReceived = false;
  operator.on("welcome", () => {
    operatorReceived = true;
  });
  const targeted = new Promise<string>((resolve) =>
    steward.once("welcome", resolve),
  );
  (app.locals.io as Server)
    .to(userRoom(stewardId))
    .emit("welcome", "private test");
  assert.equal(await targeted, "private test");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(operatorReceived, false);

  const disconnected = new Promise<string>((resolve) =>
    steward.once("disconnect", resolve),
  );
  const newToken = await login(stewardUsername, "steward123", "mobile");
  assert.equal(await disconnected, "io server disconnect");
  assert.equal(operator.connected, true);
  await assert.rejects(open(oldToken), { message: "E0001" });
  const newSocket = await open(newToken);
  assert.equal(newSocket.connected, true);
});

test("logout disconnects sockets for its session without affecting another user", async () => {
  const token = await login(stewardUsername, "steward123", "mobile");
  const steward = await open(token);
  const operator = await open(
    await login(operatorUsername, "operator123", "web"),
  );
  const disconnected = new Promise<string>((resolve) =>
    steward.once("disconnect", resolve),
  );
  const response = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 204);
  assert.equal(await disconnected, "io server disconnect");
  assert.equal(operator.connected, true);
  await assert.rejects(open(token), { message: "E0001" });
});

test("a replaced socket is disconnected if its session cannot be checked", async () => {
  const oldToken = await login(stewardUsername, "steward123", "mobile");
  const oldSocket = await open(oldToken);
  const decoded = jwt.decode(oldToken);
  assert.ok(
    decoded && typeof decoded !== "string" && typeof decoded.jti === "string",
  );
  const original = authSessionRepository.findActiveSession;
  const check = mock.method(
    authSessionRepository,
    "findActiveSession",
    async (userId, jti) => {
      if (jti === decoded.jti) throw new Error("database unavailable");
      return original(userId, jti);
    },
  );
  try {
    const disconnected = new Promise<string>((resolve) =>
      oldSocket.once("disconnect", resolve),
    );
    const newToken = await login(stewardUsername, "steward123", "mobile");
    assert.equal(await disconnected, "io server disconnect");
    assert.equal((await open(newToken)).connected, true);
  } finally {
    check.mock.restore();
  }
});

test("an activation reaches stewards in full and operators as a signal", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const operator = await open(operatorToken);
  const steward = await open(
    await login(stewardUsername, "steward123", "mobile"),
  );

  let operatorGotScenario = false;
  operator.on("scenario-activated", () => {
    operatorGotScenario = true;
  });
  let stewardGotSignal = false;
  steward.on("activations-changed", () => {
    stewardGotSignal = true;
  });
  const stewardGot = new Promise<{
    scenario: { scenarioId: string };
    sequence: number;
  }>((resolve) => steward.once("scenario-activated", resolve));
  const operatorGot = new Promise<unknown[]>((resolve) =>
    operator.once("activations-changed", (...args) => resolve(args)),
  );

  const response = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-002/activate`,
    { method: "POST", headers: { Authorization: `Bearer ${operatorToken}` } },
  );
  assert.equal(response.status, 201);
  const event = await stewardGot;
  assert.equal(event.scenario.scenarioId, "DEMO-002");
  assert.equal(event.sequence, (await response.json()).sequence);
  assert.deepEqual(await operatorGot, []);

  // Give a wrongly sent event time to arrive before checking it did not.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(operatorGotScenario, false);
  assert.equal(stewardGotSignal, false);
});

test("a position report reaches operators only, with the server's time", async () => {
  const stewardToken = await login(stewardUsername, "steward123", "mobile");
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const operator = await open(operatorToken);
  const steward = await open(stewardToken);

  let stewardGotReport = false;
  steward.on("position-report", () => {
    stewardGotReport = true;
  });
  // The coverage changed, so the phones fetch again too (#310).
  const stewardGotSignal = new Promise<unknown[]>((resolve) =>
    steward.once("activations-changed", (...args) => resolve(args)),
  );
  const received = new Promise<Record<string, string>>((resolve) =>
    operator.once("position-report", resolve),
  );

  // DEMO-002 was activated by the previous test.
  // Station G belongs to that active scenario.
  const activeResponse = await fetch(`${baseUrl}/api/v1/scenario-state`, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });

  assert.equal(activeResponse.status, 200);

  const active = await activeResponse.json();
  assert.equal(active?.scenarioId, "DEMO-002");

  // The phone's clock is wrong.
  // Station G is in DEMO-002, activated by the test above. The phone's clock is wrong.
  const before = Date.now();
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stewardToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      activationId: active.activationId,
      staff: "",
      station: "Station G",
      reportedAt: "2099-01-01T00:00:00Z",
    }),
  });
  assert.equal(response.status, 202);

  const report = await received;
  assert.equal(report.station, "Station G");
  assert.notEqual(report.staff, "");
  assert.ok(Date.parse(report.reportedAt) >= before);
  assert.ok(Date.parse(report.reportedAt) <= Date.now());
  assert.deepEqual(await stewardGotSignal, []);

  // Give a wrongly sent event time to arrive before checking it did not.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(stewardGotReport, false);
});

test("a stand-down reaches stewards and operators as signals", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const operator = await open(operatorToken);
  const steward = await open(
    await login(stewardUsername, "steward123", "mobile"),
  );

  let operatorGotStandDown = false;
  operator.on("scenario-stood-down", () => {
    operatorGotStandDown = true;
  });
  const stewardGot = new Promise<unknown[]>((resolve) =>
    steward.once("scenario-stood-down", (...args) => resolve(args)),
  );
  const operatorGot = new Promise<unknown[]>((resolve) =>
    operator.once("activations-changed", (...args) => resolve(args)),
  );

  // DEMO-002 is still active from the tests above.
  const active = await (
    await fetch(`${baseUrl}/api/v1/scenario-state`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    })
  ).json();
  assert.equal(active?.scenarioId, "DEMO-002");

  const response = await fetch(
    `${baseUrl}/api/v1/activations/${active.activationId}/stand-down`,
    { method: "POST", headers: { Authorization: `Bearer ${operatorToken}` } },
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await stewardGot, []);
  assert.deepEqual(await operatorGot, []);

  // Give a wrongly sent event time to arrive before checking it did not.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(operatorGotStandDown, false);
});

test("events for one line group never reach the other line group", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const stewardToken = await login(stewardUsername, "steward123", "mobile");
  const otherOperator = await open(
    await login(otherOperatorUsername, "operator123", "web"),
  );
  const otherSteward = await open(
    await login(otherStewardUsername, "steward123", "mobile"),
  );
  const leaked: string[] = [];
  otherOperator.onAny((event) => leaked.push(`operator: ${event}`));
  otherSteward.onAny((event) => leaked.push(`steward: ${event}`));

  // Activate, report and stand down in M3/M4.
  const activated = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-002/activate`,
    { method: "POST", headers: { Authorization: `Bearer ${operatorToken}` } },
  );
  assert.equal(activated.status, 201);
  const { activationId } = await activated.json();
  const reported = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stewardToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      activationId,
      staff: "",
      station: "Station G",
      reportedAt: new Date().toISOString(),
    }),
  });
  assert.equal(reported.status, 202);
  const stoodDown = await fetch(
    `${baseUrl}/api/v1/activations/${activationId}/stand-down`,
    { method: "POST", headers: { Authorization: `Bearer ${operatorToken}` } },
  );
  assert.equal(stoodDown.status, 200);

  // Give a wrongly sent event time to arrive before checking it did not.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.deepEqual(leaked, []);
});

test("a station message reaches operators in its line group only", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const operator = await open(operatorToken);
  const otherOperator = await open(
    await login(otherOperatorUsername, "operator123", "web"),
  );
  const activationId = await activateScenario(operatorToken);

  const leaked = record(otherOperator, "station-message");
  const received = nextEvent<StationMessageEvent>(operator, "station-message");
  const message = sendFakeMessage(activationId);

  const event = await received;
  assert.deepEqual(event.message, message);
  assert.equal(event.thread.station, "Station G");

  assert.ok(Date.now() - Date.parse(event.sentAt) < 3000);

  await settle();
  assert.deepEqual(leaked, []);

  await standDownScenario(operatorToken, activationId);
});

test("a station message reaches stewards checked in at the station only", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const arrivedToken = await login(stewardUsername, "steward123", "mobile");
  const onTheWayToken = await login(secondStewardName, "steward123", "mobile");
  const arrived = await open(arrivedToken);
  const onTheWay = await open(onTheWayToken);
  const activationId = await activateScenario(operatorToken);

  await checkInAtG(arrivedToken, activationId);
  await reportAtG(onTheWayToken, activationId);

  const notCheckedIn = record(onTheWay, "station-message");
  const received = nextEvent<StationMessageEvent>(arrived, "station-message");
  const message = sendFakeMessage(activationId);

  assert.deepEqual((await received).message, message);
  await settle();
  assert.deepEqual(notCheckedIn, []);

  await standDownScenario(operatorToken, activationId);
});

test("a steward who checks out stops getting messages without reconnecting", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const stewardToken = await login(stewardUsername, "steward123", "mobile");
  const steward = await open(stewardToken);
  const activationId = await activateScenario(operatorToken);
  await checkInAtG(stewardToken, activationId);

  const first = nextEvent(steward, "station-message");
  sendFakeMessage(activationId);
  await first;

  await reportAtG(stewardToken, activationId, "CHECKED_OUT");
  const afterCheckOut = record(steward, "station-message");
  sendFakeMessage(activationId);
  await settle();
  assert.deepEqual(afterCheckOut, []);

  await standDownScenario(operatorToken, activationId);
});

test("a steward who reconnects while checked in gets messages again", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const stewardToken = await login(stewardUsername, "steward123", "mobile");
  const firstSocket = await open(stewardToken);
  const activationId = await activateScenario(operatorToken);
  await checkInAtG(stewardToken, activationId);

  firstSocket.disconnect();
  const secondSocket = await open(stewardToken);

  const received = nextEvent(secondSocket, "station-message");
  sendFakeMessage(activationId);
  await received;

  await standDownScenario(operatorToken, activationId);
});

test("a stand-down closes the threads for both roles and empties the station rooms", async () => {
  const operatorToken = await login(operatorUsername, "operator123", "web");
  const stewardToken = await login(stewardUsername, "steward123", "mobile");
  const operator = await open(operatorToken);
  const steward = await open(stewardToken);
  const activationId = await activateScenario(operatorToken);
  await checkInAtG(stewardToken, activationId);

  const operatorClosed = nextEvent<StationThreadsClosed>(
    operator,
    "station-threads-closed",
  );
  const stewardClosed = nextEvent<StationThreadsClosed>(
    steward,
    "station-threads-closed",
  );
  await standDownScenario(operatorToken, activationId);

  assert.equal((await operatorClosed).activationId, activationId);
  assert.equal((await stewardClosed).activationId, activationId);

  const late = record(steward, "station-message");
  sendFakeMessage(activationId);
  await settle();
  assert.deepEqual(late, []);
});
test("a switch closes the replaced activation's threads", async () => {
  const operatorToken = await login(
    otherOperatorUsername,
    "operator123",
    "web",
  );
  const stewardToken = await login(
    otherStewardUsername,
    "steward123",
    "mobile",
  );
  const operator = await open(operatorToken);
  const steward = await open(stewardToken);
  const oldId = await activateScenario(operatorToken, "DEMO-001");
  await checkInAtG(stewardToken, oldId, "Station B");

  const operatorClosed = nextEvent<StationThreadsClosed>(
    operator,
    "station-threads-closed",
  );
  const stewardClosed = nextEvent<StationThreadsClosed>(
    steward,
    "station-threads-closed",
  );
  const newId = await activateScenario(operatorToken, "DEMO-003", oldId);

  assert.equal((await operatorClosed).activationId, oldId);
  assert.equal((await stewardClosed).activationId, oldId);

  const late = record(steward, "station-message");
  sendFakeMessage(oldId, "M1_M2", "Station B");
  await settle();
  assert.deepEqual(late, []);

  await standDownScenario(operatorToken, newId);
});
