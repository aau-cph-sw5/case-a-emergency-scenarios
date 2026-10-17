import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { login, userIdFromToken } from "../../shared/auth/login.js";
import { loadActiveScenario } from "../../shared/scenario/active-scenario.js";

let server: Server;
let baseUrl: string;

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

test("a logged-in steward loads the active scenario from the real server", async () => {
  const { token } = await login(baseUrl, "steward-test", "steward-test-pw");

  const result = await loadActiveScenario(baseUrl, token);

  assert.equal(userIdFromToken(token), "steward-test");
  assert.equal(result.active, true);
  if (result.active) {
    assert.equal(result.scenario.scenarioId, result.state.scenarioId);
  }
});
