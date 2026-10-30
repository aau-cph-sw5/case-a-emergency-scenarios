import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import jwt from "jsonwebtoken";

const SECRET = "integration-test-secret";

// node:http rather than fetch: the repo's ESLint targets Node >=20.19, where
// the n plugin still flags fetch as experimental.
function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const req = http.request(
      { host: "localhost", port, method, path, headers },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode, json: () => JSON.parse(text) }),
        );
      },
    );
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

let stub;
let port;

// Asks the OS for a free port so a stub already running on 4010 does not
// clash with the one the test spawns.
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const { port: free } = server.address();
      server.close(() => resolve(free));
    });
  });
}

before(async () => {
  port = await freePort();
  stub = spawn("node", ["--import", "tsx", "stub-server/server.js"], {
    env: { ...process.env, JWT_SECRET: SECRET, PORT: String(port) },
    stdio: "ignore",
  });
  for (let i = 0; i < 50; i++) {
    try {
      await request("GET", "/");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("Stub server did not start");
});

after(() => stub.kill());

function tokenFor(userId, role) {
  return jwt.sign({ userId, role }, SECRET, { expiresIn: "1h" });
}

const steward = tokenFor("steward-test", "STEWARD");
const operator = tokenFor("operator-test", "OPERATOR");
const setStatus = (status, station = "Station B") =>
  request("PUT", "/api/v1/steward-status", steward, { status, station });

// The tests run in order and share one stub, like a steward's shift.
test("without an active scenario a status is refused with E1001", async () => {
  const res = await setStatus("ASSIGNED");
  assert.equal(res.status, 409);
  assert.equal(res.json().error.code, "E1001");
});

test("a steward has no status in a new activation", async () => {
  const activated = await request(
    "POST",
    "/api/v1/scenarios/DEMO-001/activate",
    operator,
  );
  assert.equal(activated.status, 201);

  const res = await request("GET", "/api/v1/steward-status", steward);
  assert.equal(res.status, 200);
  assert.equal(res.json(), null);
});

test("checking in before assigning is refused with E1006", async () => {
  const res = await setStatus("CHECKED_IN");
  assert.equal(res.status, 409);
  assert.equal(res.json().error.code, "E1006");
  assert.equal(typeof res.json().error.message, "string");
});

test("a station outside the scenario is refused with E1004", async () => {
  const res = await setStatus("ASSIGNED", "Station Z");
  assert.equal(res.status, 409);
  assert.equal(res.json().error.code, "E1004");
});

test("a steward assigns, checks in and checks out", async () => {
  for (const status of ["ASSIGNED", "CHECKED_IN", "CHECKED_OUT"]) {
    const res = await setStatus(status);
    assert.equal(res.status, 200);
    assert.equal(res.json().status, status);
    assert.equal(res.json().station, "Station B");
    assert.equal(res.json().userId, 1);
  }

  const own = await request("GET", "/api/v1/steward-status", steward);
  assert.equal(own.json().status, "CHECKED_OUT");
});

test("repeating the current status changes nothing", async () => {
  const before = (
    await request("GET", "/api/v1/steward-status", steward)
  ).json();
  const res = await setStatus("CHECKED_OUT");
  assert.equal(res.status, 200);
  assert.deepEqual(res.json(), before);
});

test("an invalid body is refused with E0006", async () => {
  const res = await request("PUT", "/api/v1/steward-status", steward, {
    status: "EN_ROUTE",
  });
  assert.equal(res.status, 400);
  assert.equal(res.json().error.code, "E0006");
});

test("the control room reads every status, a steward may not", async () => {
  const res = await request("GET", "/api/v1/steward-statuses", operator);
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.json().map(({ userId, status }) => ({ userId, status })),
    [{ userId: 1, status: "CHECKED_OUT" }],
  );

  const refused = await request("GET", "/api/v1/steward-statuses", steward);
  assert.equal(refused.status, 403);
  assert.equal(refused.json().error.code, "E0002");
});

test("an operator may not set a steward status", async () => {
  const res = await request("PUT", "/api/v1/steward-status", operator, {
    status: "ASSIGNED",
    station: "Station B",
  });
  assert.equal(res.status, 403);
  assert.equal(res.json().error.code, "E0002");
});
