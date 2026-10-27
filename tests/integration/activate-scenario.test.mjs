import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import jwt from "jsonwebtoken";

const SECRET = "integration-test-secret";

// node:http rather than fetch: the repo's ESLint targets Node >=20.19, where
// the n plugin still flags fetch as experimental.
function request(method, path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "localhost",
        port,
        method,
        path,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
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

async function activate(scenarioId, token) {
  const res = await request(
    "POST",
    `/api/v1/scenarios/${scenarioId}/activate`,
    token,
  );
  return { status: res.status, json: () => JSON.parse(res.body) };
}

const operator = tokenFor("operator-test", "OPERATOR");

test("without a token the activation is refused with E0001", async () => {
  const res = await activate("DEMO-002");
  assert.equal(res.status, 401);
  assert.equal(res.json().error.code, "E0001");
});

test("a steward may not activate a scenario", async () => {
  const res = await activate("DEMO-002", tokenFor("steward-test", "STEWARD"));
  assert.equal(res.status, 403);
  assert.equal(res.json().error.code, "E0002");
});

test("an operator activates a second scenario while DEMO-001 is active", async () => {
  const res = await activate("DEMO-002", operator);
  assert.equal(res.status, 201);
  const activation = res.json();
  assert.equal(activation.status, "ACTIVE");
  assert.equal(activation.actor, "operator-test");
});

test("an operator activates a second scenario on the same line as DEMO-001", async () => {
  // DEMO-001 (Station A-B) and DEMO-003 (Station B-C) are both on track 1.
  const res = await activate("DEMO-003", operator);
  assert.equal(res.status, 201);
  const activation = res.json();
  assert.equal(activation.scenarioId, "DEMO-003");
  assert.equal(activation.status, "ACTIVE");
});

test("activating the same scenario twice is refused with E0007", async () => {
  assert.equal((await activate("DEMO-001", operator)).status, 201);
  const res = await activate("DEMO-001", operator);
  assert.equal(res.status, 409);
  assert.equal(res.json().error.code, "E0007");
});

test("an unknown scenario is refused with E0004", async () => {
  const res = await activate("NOPE", operator);
  assert.equal(res.status, 404);
  assert.equal(res.json().error.code, "E0004");
});
