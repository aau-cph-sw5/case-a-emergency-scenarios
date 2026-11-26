import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { closeOwnerDatabase, getOwnerDatabase, seededUser } from "./helpers.js";

// PUT /api/v1/me/push-token over HTTP (ADR 0014, MET-A-018)

let server: Server;
let baseUrl: string;
let stewardId: number;

before(async () => {
  const users = await seedTestUsers("push-");
  stewardId = seededUser(users, "STEWARD", "M1_M2").id;
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

async function login(username: string, client: "web" | "mobile") {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password: username.includes("operator") ? "operator123" : "steward123",
      client,
    }),
  });
  const { token } = (await response.json()) as { token: string };
  return { Authorization: `Bearer ${token}` };
}

function putPushToken(headers: Record<string, string>, body: unknown) {
  return fetch(`${baseUrl}/api/v1/me/push-token`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function storedPushToken(userId: number) {
  const [session] = await getOwnerDatabase()<{ pushToken: string | null }[]>`
    SELECT push_token AS "pushToken" FROM auth_sessions WHERE user_id = ${userId}
  `;
  return session?.pushToken ?? null;
}

test("stores the steward's push token on their session", async () => {
  const response = await putPushToken(await login("push-steward", "mobile"), {
    pushToken: "fcm-token-stored",
  });

  assert.equal(response.status, 204);
  assert.equal(await storedPushToken(stewardId), "fcm-token-stored");
});

test("logging out removes the push token", async () => {
  const headers = await login("push-steward", "mobile");
  await putPushToken(headers, { pushToken: "fcm-token-logout" });

  await fetch(`${baseUrl}/api/v1/auth/logout`, { method: "POST", headers });

  assert.equal(await storedPushToken(stewardId), null);
});

test("rejects a missing or empty push token with 400", async () => {
  const headers = await login("push-steward", "mobile");

  assert.equal((await putPushToken(headers, {})).status, 400);
  assert.equal((await putPushToken(headers, { pushToken: "" })).status, 400);
});

test("rejects a request without a session, or after logout, with 401", async () => {
  const headers = await login("push-steward", "mobile");
  await fetch(`${baseUrl}/api/v1/auth/logout`, { method: "POST", headers });

  assert.equal(
    (await putPushToken({}, { pushToken: "fcm-token" })).status,
    401,
  );
  assert.equal(
    (await putPushToken(headers, { pushToken: "fcm-token" })).status,
    401,
  );
});

test("is for stewards only", async () => {
  const response = await putPushToken(await login("push-operator", "web"), {
    pushToken: "fcm-token",
  });

  assert.equal(response.status, 403);
  assert.equal(
    ((await response.json()) as { error: { code: string } }).error.code,
    "E0002",
  );
});
