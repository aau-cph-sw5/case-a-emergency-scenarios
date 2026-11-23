import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { login, userIdFromToken } from "../../shared/auth/login.js";
import { loadActiveScenario } from "../../shared/scenario/active-scenario.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  seedTestScenarios,
} from "./helpers.js";

let server: Server;
let baseUrl: string;
let stewardId: number;

const STEWARD_USERNAME = "offline-steward";

before(async () => {
  await seedTestScenarios();
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
  await closeOwnerDatabase();
});

test("a logged-in steward loads the active scenario from the real server", async () => {
  const { token } = await login(
    baseUrl,
    STEWARD_USERNAME,
    "steward123",
    "mobile",
  );

  // This test starts with no active scenario and the server answers null.
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
    const owner = getOwnerDatabase();
    const [{ originalVersion }] = await owner<{ originalVersion: number }[]>`
      SELECT current_version_id AS original_version FROM scenarios WHERE scenario_id = 'DEMO-001'
    `;
    const [{ id: newVersion }] = await owner<{ id: number }[]>`
      INSERT INTO scenario_versions (scenario_id, version, revision)
      VALUES ('DEMO-001', 'test-new-version', 'A later version') RETURNING id
    `;
    try {
      await owner`UPDATE scenarios SET current_version_id = ${newVersion} WHERE scenario_id = 'DEMO-001'`;

      const current = await fetch(`${baseUrl}/api/v1/scenarios/DEMO-001`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal((await current.json()).currentVersion, "test-new-version");
      const pinned = await loadActiveScenario(baseUrl, token);
      assert.equal(pinned.active, true);
      if (pinned.active)
        assert.equal(
          pinned.scenario.currentVersion,
          result.scenario.currentVersion,
        );

      const wrongScenario = await fetch(
        `${baseUrl}/api/v1/scenarios/DEMO-002?activationId=${result.state.activationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      assert.equal(wrongScenario.status, 404);
    } finally {
      await owner`UPDATE scenarios SET current_version_id = ${originalVersion} WHERE scenario_id = 'DEMO-001'`;
      await owner`DELETE FROM scenario_versions WHERE id = ${newVersion}`;
    }
  }

  // A new server instance reads the same activation from the database.
  await new Promise<void>((resolve) => server.close(() => resolve()));
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const afterRestart = await loadActiveScenario(baseUrl, token);
  assert.equal(afterRestart.active, true);
  if (result.active && afterRestart.active) {
    assert.equal(afterRestart.state.activationId, result.state.activationId);
  }
});
