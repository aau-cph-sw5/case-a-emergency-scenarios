import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { validate } from "../../src/validation/contract-validator.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { seedTestScenarios } from "./helpers.js";

// POST /api/v1/scenario-suggestions against the real API and test database
// (MET-A-019, #371). The scenarios are the synthetic DEMO fixtures: DEMO-001
// covers Station A - Station B and DEMO-003 Station B - Station C on M1/M2,
// DEMO-002 covers Station F - Station G on M3/M4.

const PREFIX = "suggest-";
const PATH = "/api/v1/scenario-suggestions";

let server: Server;
let baseUrl: string;

before(async () => {
  await seedTestUsers(PREFIX);
  await seedTestScenarios();
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getDatabase().end();
});

async function tokenFor(username: string, password: string, client: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: PREFIX + username, password, client }),
  });
  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

const operatorToken = () => tokenFor("operator", "operator123", "web");

function suggest(body: unknown, token?: string) {
  return fetch(`${baseUrl}${PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("suggests the scenario for the described stretch, in the contract's shape", async () => {
  const response = await suggest(
    { description: "Signalfejl mellem Station A og Station B spor 1" },
    await operatorToken(),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(validate(body, "scenario-suggestion.schema.json"), []);
  assert.equal(body.status, "CONFIDENT");
  assert.equal(body.candidates[0].scenarioId, "DEMO-001");
});

test("says no scenario fits when the description names no place", async () => {
  const response = await suggest(
    { description: "Passager med akut sygdom i toget" },
    await operatorToken(),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(validate(body, "scenario-suggestion.schema.json"), []);
  assert.deepEqual(body, { status: "NO_CONFIDENT_CANDIDATE" });
});

test("only suggests scenarios from the operator's own line group", async () => {
  const description = "Signalfejl mellem Station F og Station G spor 2";

  const m1m2 = await (
    await suggest({ description }, await operatorToken())
  ).json();
  const m1m2Ids = (m1m2.candidates ?? []).map(
    (candidate: { scenarioId: string }) => candidate.scenarioId,
  );
  assert.ok(!m1m2Ids.includes("DEMO-002"));

  const m3m4 = await (
    await suggest(
      { description },
      await tokenFor("operator-m3m4", "operator123", "web"),
    )
  ).json();
  assert.equal(m3m4.status, "CONFIDENT");
  assert.equal(m3m4.candidates[0].scenarioId, "DEMO-002");
});

test("refuses a request without a token", async () => {
  const response = await suggest({ description: "Signalfejl ved Station A" });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "E0001");
});

test("refuses a role other than operator", async () => {
  const response = await suggest(
    { description: "Signalfejl ved Station A" },
    await tokenFor("steward", "steward123", "mobile"),
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "E0002");
});

test("refuses a body that does not match the contract", async () => {
  const token = await operatorToken();
  for (const body of [
    {},
    { description: "" },
    { description: "a".repeat(2001) },
    { description: "Signalfejl ved Station A", extra: true },
  ]) {
    const response = await suggest(body, token);
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 40));
    assert.equal((await response.json()).error.code, "E0006");
  }
});
