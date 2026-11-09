import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { listActivations } from "../../src/repositories/activation-repository.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  seedTestScenarios,
} from "./helpers.js";

const sql = getDatabase();
// The application may not delete position reports, so cleanup runs as the owner.
const owner = getOwnerDatabase();
let server: Server;
let baseUrl: string;
let stewardId: string;
let stewardToken: string;
let operatorToken: string;
let activationId: number;

async function login(username: string, password: string, client: string) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });
  return ((await response.json()) as { token: string }).token;
}

before(async () => {
  const users = await seedTestUsers("deployment-");
  await seedTestScenarios();
  const steward = users.find((user) => user.role === "STEWARD")!;
  const operator = users.find((user) => user.role === "OPERATOR")!;
  stewardId = String(steward.id);

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  stewardToken = await login(steward.username, "steward123", "mobile");
  operatorToken = await login(operator.username, "operator123", "web");
  const activated = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-002/activate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${operatorToken}` },
    },
  );
  assert.equal(activated.status, 201);
  ({ activationId } = (await activated.json()) as { activationId: number });
  await owner`DELETE FROM position_reports WHERE staff = ${stewardId}`;
});

after(async () => {
  await owner`DELETE FROM position_reports WHERE staff = ${stewardId}`;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
  await closeOwnerDatabase();
});

async function report(extra: { event?: string; taskDone?: boolean } = {}) {
  const response = await fetch(`${baseUrl}/api/v1/position-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stewardToken}`,
    },
    body: JSON.stringify({
      activationId,
      staff: "",
      station: "Station G",
      reportedAt: "2026-11-06T08:00:00Z",
      ...extra,
    }),
  });
  return { status: response.status, body: await response.json() };
}

async function deploymentAtG() {
  const response = await fetch(`${baseUrl}/api/v1/activations?status=ACTIVE`, {
    headers: { Authorization: `Bearer ${operatorToken}` },
  });
  const [activation] = (await response.json()) as {
    deployments: {
      status: string;
      staff: string | null;
      fulfills: string;
      arrivedAt?: string | null;
    }[];
  }[];
  return activation.deployments.find((d) => d.fulfills === "Station G");
}

async function expectRefused(extra: { event?: string; taskDone?: boolean }) {
  const res = await report(extra);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "E1006");
}

test("ARRIVED without being on the way is refused with E1006", async () => {
  await expectRefused({ event: "ARRIVED" });
  assert.equal((await deploymentAtG())?.status, "UNMANNED");
});

test("on the way, arrived and checked out move the deployment", async () => {
  assert.equal((await report()).status, 202);
  assert.equal((await deploymentAtG())?.status, "PENDING");
  assert.equal((await deploymentAtG())?.staff, stewardId);

  assert.equal((await report({ event: "ARRIVED" })).status, 202);
  const arrived = await deploymentAtG();
  assert.equal(arrived?.status, "MANNED");
  assert.ok(arrived?.arrivedAt);

  // A report without event while arrived is a repeat, not a step back.
  assert.equal((await report()).status, 202);
  assert.equal((await deploymentAtG())?.status, "MANNED");

  assert.equal((await report({ event: "CHECKED_OUT" })).status, 202);
  const checkedOut = await deploymentAtG();
  assert.equal(checkedOut?.status, "CHECKED_OUT");
  assert.equal(checkedOut?.staff, stewardId);
});

test("the deployments read again from the database are the same", async () => {
  const [fromDatabase] = await listActivations("ACTIVE");
  assert.deepEqual(
    fromDatabase.deployments.find((d) => d.fulfills === "Station G"),
    await deploymentAtG(),
  );
});

test("cancelling frees the station", async () => {
  assert.equal((await report({ event: "EN_ROUTE" })).status, 202);
  assert.equal((await deploymentAtG())?.status, "PENDING");
  assert.equal((await report({ event: "CANCELLED" })).status, 202);
  const freed = await deploymentAtG();
  assert.equal(freed?.status, "UNMANNED");
  assert.equal(freed?.staff, null);
});

test("a new station after arriving is refused with E1006", async () => {
  // DEMO-002 has only Station G, so the arrival elsewhere is written directly.
  await owner`
    INSERT INTO position_reports (staff, station, reported_at, event)
    VALUES (${stewardId}, 'Station H', now(), 'ARRIVED')
  `;
  await expectRefused({});
});

test("the event records what the report said", async () => {
  const events = await sql<{ payload: { event: string } }[]>`
    SELECT payload FROM incident_events
    WHERE type = 'POSITION_REPORTED' AND actor_id = ${stewardId}
    ORDER BY sequence
  `;
  assert.deepEqual(
    events.map((e) => e.payload.event),
    ["EN_ROUTE", "ARRIVED", "CHECKED_OUT", "EN_ROUTE", "CANCELLED"],
  );
});
