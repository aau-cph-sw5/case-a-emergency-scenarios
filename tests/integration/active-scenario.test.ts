import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { login, userIdFromToken } from "../../shared/auth/login.js";
import { loadActiveScenario } from "../../shared/scenario/active-scenario.js";

let server: Server;
let baseUrl: string;
let stewardId: number;

const STEWARD_USERNAME = "offline-steward";

before(async () => {
  const users = await seedTestUsers("offline-");
  stewardId = users.find((user) => user.username === STEWARD_USERNAME)!.id;

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
});

test("a logged-in steward loads the active scenario from the real server", async () => {
  const { token } = await login(
    baseUrl,
    STEWARD_USERNAME,
    "steward123",
    "mobile",
  );

  // The server starts with no active scenario and answers null.
  assert.deepEqual(await loadActiveScenario(baseUrl, token), { active: false });

  const operator = await login(
    baseUrl,
    "offline-operator",
    "operator123",
    "web",
  );
  const activation = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-001/activate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${operator.token}` },
    },
  );
  assert.equal(activation.status, 201);

  const result = await loadActiveScenario(baseUrl, token);

  // The server signs the database id, read back as a string.
  assert.equal(userIdFromToken(token), String(stewardId));
  assert.equal(result.active, true);
  if (result.active) {
    assert.equal(result.scenario.scenarioId, result.state.scenarioId);
  }
});
