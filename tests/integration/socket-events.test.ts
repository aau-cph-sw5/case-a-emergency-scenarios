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
import { seedTestScenarios } from "./helpers.js";

let server: HttpServer;
let baseUrl: string;
let operatorUsername: string;
let stewardUsername: string;
let stewardId: number;
const sockets: Socket[] = [];

before(async () => {
  const users = await seedTestUsers("socket-");
  await seedTestScenarios();
  operatorUsername = users.find((user) => user.role === "OPERATOR")!.username;
  stewardUsername = users.find((user) => user.role === "STEWARD")!.username;
  stewardId = users.find((user) => user.role === "STEWARD")!.id;

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
  const stewardGot = new Promise<{ scenario: { scenarioId: string } }>(
    (resolve) => steward.once("scenario-activated", resolve),
  );
  const operatorGot = new Promise<unknown[]>((resolve) =>
    operator.once("activations-changed", (...args) => resolve(args)),
  );

  const response = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-002/activate`,
    { method: "POST", headers: { Authorization: `Bearer ${operatorToken}` } },
  );
  assert.equal(response.status, 201);
  assert.equal((await stewardGot).scenario.scenarioId, "DEMO-002");
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
  const received = new Promise<Record<string, string>>((resolve) =>
    operator.once("position-report", resolve),
  );

  // Station B is in DEMO-001, which nothing has activated yet.
  const activation = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-001/activate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    },
  );
  assert.equal(activation.status, 201);

  // The phone's clock is wrong.
  const before = Date.now();
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stewardToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      staff: "",
      station: "Station B",
      reportedAt: "2099-01-01T00:00:00Z",
    }),
  });
  assert.equal(response.status, 202);

  const report = await received;
  assert.equal(report.station, "Station B");
  assert.notEqual(report.staff, "");
  assert.ok(Date.parse(report.reportedAt) >= before);
  assert.ok(Date.parse(report.reportedAt) <= Date.now());

  // Give a wrongly sent event time to arrive before checking it did not.
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(stewardGotReport, false);
});
