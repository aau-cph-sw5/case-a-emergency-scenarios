import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { fetchScenarios } from "../../web/src/scenarios.js";

let server: Server;
let baseUrl: string;

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

const toTestServer: typeof fetch = (input, init) =>
  fetch(`${baseUrl}${input}`, init);

async function operatorToken() {
  const response = await toTestServer("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "operator-test",
      password: "operator-test-pw",
    }),
  });
  return ((await response.json()) as { token: string }).token;
}

test("fetchScenarios loads the list from the real server with a real token", async () => {
  const scenarios = await fetchScenarios(
    await operatorToken(),
    new AbortController().signal,
    toTestServer,
  );
  assert.ok(scenarios.length > 0);
});
