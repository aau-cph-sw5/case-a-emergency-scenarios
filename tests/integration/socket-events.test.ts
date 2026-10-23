import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";
import { io as connect, type Socket } from "socket.io-client";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { attachSocketHandlers } from "../../src/realtime/socket-server.js";

let server: HttpServer;
let baseUrl: string;
const sockets: Socket[] = [];

before(async () => {
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
  // A position report is stored in the database, so the pool is open by now.
  await getDatabase().end();
});

async function login(username: string, password: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
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
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

test("a socket without a valid token is refused with E0001", async () => {
  await assert.rejects(open(), { message: "E0001" });
  await assert.rejects(open("not-a-token"), { message: "E0001" });
});

test("an activation reaches stewards in full and operators as a signal", async () => {
  const operatorToken = await login("operator-test", "operator-test-pw");
  const operator = await open(operatorToken);
  const steward = await open(await login("steward-test", "steward-test-pw"));

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
  const stewardToken = await login("steward-test", "steward-test-pw");
  const operator = await open(await login("operator-test", "operator-test-pw"));
  const steward = await open(stewardToken);

  let stewardGotReport = false;
  steward.on("position-report", () => {
    stewardGotReport = true;
  });
  const received = new Promise<Record<string, string>>((resolve) =>
    operator.once("position-report", resolve),
  );

  // Station B is in the fixture's active scenario. The phone's clock is wrong.
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
