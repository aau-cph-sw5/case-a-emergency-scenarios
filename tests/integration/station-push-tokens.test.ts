import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { authSessionRepository } from "../../src/repositories/auth-session-repository.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import {
  closeOwnerDatabase,
  getOwnerDatabase,
  seedTestScenarios,
  seededUser,
} from "./helpers.js";

const owner = getOwnerDatabase();
const createdUserIds: number[] = [];
let activationId: number;

before(async () => {
  const users = await seedTestUsers("stationpush-");
  await seedTestScenarios();
  const operator = seededUser(users, "OPERATOR", "M3_M4");

  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: operator.username,
      password: "operator123",
      client: "web",
    }),
  });
  const { token } = (await login.json()) as { token: string };

  const activated = await fetch(
    `${baseUrl}/api/v1/scenarios/DEMO-002/activate`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  assert.equal(activated.status, 201);
  ({ activationId } = (await activated.json()) as { activationId: number });

  await new Promise<void>((resolve) => server.close(() => resolve()));
});

after(async () => {
  const staff = createdUserIds.map(String);
  await owner`DELETE FROM position_reports WHERE staff IN ${owner(staff)}`;
  await owner`DELETE FROM users WHERE id IN ${owner(createdUserIds)}`;
  await getDatabase().end();
  await closeOwnerDatabase();
});


async function stewardWithToken() {
  const [user] = await owner<{ id: number }[]>`
    INSERT INTO users (username, password_hash, role, line_group)
    VALUES (${`stationpush-${randomUUID()}`}, ${"not-a-real-password-hash"},
            ${"STEWARD"}, ${"M3_M4"})
    RETURNING id
  `;
  createdUserIds.push(user.id);

  const jti = randomUUID();
  const pushToken = `token-${randomUUID()}`;
  await authSessionRepository.startSession(
    user.id,
    jti,
    new Date(Date.now() + 60 * 60 * 1000),
  );
  await authSessionRepository.savePushToken(user.id, jti, pushToken);
  return { id: user.id, jti, pushToken };
}

async function report(
  stewardId: number,
  station: string,
  event: "ARRIVED" | "CHECKED_OUT",
  taskDone = false,
) {
  await owner`
    INSERT INTO position_reports
      (staff, station, reported_at, event, task_done, activation_id)
    VALUES (${String(stewardId)}, ${station}, now(), ${event},
            ${taskDone}, ${activationId})
  `;
}

function tokensFor(station: string, senderId: number | null = null) {
  return authSessionRepository.findStationStewardPushTokens(
    activationId,
    station,
    senderId,
  );
}

test("finds stewards checked in at the station and no one at another station", async () => {
  const here = await stewardWithToken();
  const elsewhere = await stewardWithToken();
  await report(here.id, "Station G", "ARRIVED");
  await report(elsewhere.id, "Station H", "ARRIVED");

  const tokens = await tokensFor("Station G");

  assert.ok(tokens.includes(here.pushToken));
  assert.ok(!tokens.includes(elsewhere.pushToken));
});

test("skips a steward whose newest report is not a check-in at the station", async () => {
  const checkedOut = await stewardWithToken();
  const moved = await stewardWithToken();
  const taskDone = await stewardWithToken();
  await report(checkedOut.id, "Station G", "ARRIVED");
  await report(checkedOut.id, "Station G", "CHECKED_OUT");
  await report(moved.id, "Station G", "ARRIVED");
  await report(moved.id, "Station H", "ARRIVED");
  await report(taskDone.id, "Station G", "ARRIVED", true);

  const tokens = await tokensFor("Station G");

  assert.ok(!tokens.includes(checkedOut.pushToken));
  assert.ok(!tokens.includes(moved.pushToken));
  assert.ok(!tokens.includes(taskDone.pushToken));
});

test("skips the sender, but not when the control room sends", async () => {
  const sender = await stewardWithToken();
  const other = await stewardWithToken();
  await report(sender.id, "Station G", "ARRIVED");
  await report(other.id, "Station G", "ARRIVED");

  const fromSteward = await tokensFor("Station G", sender.id);
  assert.ok(!fromSteward.includes(sender.pushToken));
  assert.ok(fromSteward.includes(other.pushToken));

  const fromControlRoom = await tokensFor("Station G", null);
  assert.ok(fromControlRoom.includes(sender.pushToken));
  assert.ok(fromControlRoom.includes(other.pushToken));
});

test("skips a checked-in steward who has logged out", async () => {
  const steward = await stewardWithToken();
  await report(steward.id, "Station G", "ARRIVED");
  await authSessionRepository.revokeSession(steward.id, steward.jti);

  assert.ok(!(await tokensFor("Station G")).includes(steward.pushToken));
});