import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../../src/app.js";
import { getDatabase } from "../../src/db/client.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import { seedTestScenarios } from "./helpers.js";
import { validate } from "../../src/validation/contract-validator.js";

const sql = getDatabase();

let server: Server;
let baseUrl: string;
let operatorToken: string;
let stewardToken: string;
let stewardId: number;

type Method = "GET" | "POST";

async function login(
  username: string,
  password: string,
  client: "web" | "mobile",
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, client }),
  });

  assert.equal(response.status, 200);
  return ((await response.json()) as { token: string }).token;
}

function api(
  path: string,
  token: string,
  method: Method = "GET",
  body?: unknown,
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

before(async () => {
  const users = await seedTestUsers("station-message-");
  await seedTestScenarios();

  stewardId = users.find((user) => user.role === "STEWARD")!.id;

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  operatorToken = await login("station-message-operator", "operator123", "web");
  stewardToken = await login("station-message-steward", "steward123", "mobile");
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await sql.end();
});

test("station messages are guarded, stored, logged and idempotent", async () => {
  const station = "Station C";

  const activationResponse = await api(
    "/api/v1/scenarios/DEMO-003/activate",
    operatorToken,
    "POST",
    {},
  );
  assert.equal(activationResponse.status, 201);

  const activation = (await activationResponse.json()) as {
    activationId: number;
  };

  // A steward who has not arrived must not be able to read the thread.
  const beforeCheckIn = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}`,
    stewardToken,
  );
  assert.equal(beforeCheckIn.status, 409);
  assert.equal(
    ((await beforeCheckIn.json()) as { error: { code: string } }).error.code,
    "E1007",
  );

  // Position reports move the steward from EN_ROUTE to ARRIVED.
  for (const event of ["EN_ROUTE", "ARRIVED"]) {
    const report = await api("/api/v1/position-reports", stewardToken, "POST", {
      activationId: activation.activationId,
      staff: "ignored-by-server",
      station,
      reportedAt: new Date().toISOString(),
      event,
    });
    assert.equal(report.status, 202);
  }
  const operatorFirstBody = {
    clientMessageId: randomUUID(),
    activationId: activation.activationId,
    text: "Operator starts this thread",
    writtenAt: new Date().toISOString(),
  };

  const operatorFirstSend = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    operatorToken,
    "POST",
    operatorFirstBody,
  );
  assert.equal(operatorFirstSend.status, 201);
  assert.equal(
    ((await operatorFirstSend.json()) as { sender: string }).sender,
    "CONTROL_ROOM",
  );

  const operatorFirstThreadResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}`,
    operatorToken,
  );
  assert.equal(operatorFirstThreadResponse.status, 200);

  const operatorFirstThread = (await operatorFirstThreadResponse.json()) as {
    state: string;
    messages: { sender: string }[];
  };
  assert.equal(operatorFirstThread.state, "ANSWERED");
  assert.equal(operatorFirstThread.messages.length, 1);
  assert.equal(operatorFirstThread.messages[0].sender, "CONTROL_ROOM");

  const messageBody = {
    clientMessageId: randomUUID(),
    activationId: activation.activationId,
    text: "Integration test message",
    writtenAt: new Date().toISOString(),
  };

  const firstSend = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    stewardToken,
    "POST",
    messageBody,
  );
  assert.equal(firstSend.status, 201);

  const message = await firstSend.json();
  assert.equal(message.sender, "STATION");
  assert.deepEqual(validate(message, "station-message.schema.json"), []);
  assert.equal("staff" in message, false);
  assert.equal("userId" in message, false);

  const operatorThreads = await api("/api/v1/station-threads", operatorToken);
  assert.equal(operatorThreads.status, 200);

  const threads = (await operatorThreads.json()) as {
    station: string;
    state: string;
    messages?: unknown[];
  }[];
  const unanswered = threads.find((thread) => thread.station === station);
  assert.equal(unanswered?.state, "UNANSWERED");
  assert.equal(unanswered?.messages, undefined);

  // The exact same request is acknowledged without creating another message.
  const retry = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    stewardToken,
    "POST",
    messageBody,
  );
  assert.equal(retry.status, 200);

  const conflict = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    stewardToken,
    "POST",
    { ...messageBody, text: "Different content with the same ID" },
  );
  assert.equal(conflict.status, 409);
  assert.equal(
    ((await conflict.json()) as { error: { code: string } }).error.code,
    "E0007",
  );

  // The incident event contains the message data, not the steward's identity.
  const events = await sql<
    {
      actorId: string;
      actorRole: string | null;
      payload: Record<string, unknown>;
    }[]
  >`
    SELECT actor_id, actor_role, payload
    FROM incident_events
    WHERE type = 'STATION_MESSAGE_WRITTEN'
      AND subject_id = ${String(message.id)}
  `;

  assert.equal(events.length, 1);
  assert.equal(events[0].actorRole, null);
  assert.notEqual(events[0].actorId, String(stewardId));
  assert.equal(events[0].payload.station, station);
  assert.equal(events[0].payload.text, messageBody.text);
  assert.equal(events[0].payload.writtenAt, message.writtenAt);
  assert.equal(events[0].payload.receivedAt, message.receivedAt);
  assert.equal("staff" in events[0].payload, false);
  assert.equal("userId" in events[0].payload, false);

  const replyBody = {
    clientMessageId: randomUUID(),
    activationId: activation.activationId,
    text: "Operator reply",
    writtenAt: new Date().toISOString(),
  };

  const reply = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    operatorToken,
    "POST",
    replyBody,
  );
  assert.equal(reply.status, 201);
  const replyMessage = (await reply.json()) as {
    id: number;
    sender: string;
    writtenAt: string;
    receivedAt: string;
  };
  assert.equal(replyMessage.sender, "CONTROL_ROOM");

  const readThread = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}`,
    stewardToken,
  );
  assert.equal(readThread.status, 200);
  assert.equal(
    ((await readThread.json()) as { state: string }).state,
    "ANSWERED",
  );

  // Simulate an offline message: it was written earlier but arrives after the reply.
  const delayedStewardBody = {
    clientMessageId: randomUUID(),
    activationId: activation.activationId,
    text: "Written before the operator reply, delivered after it",
    writtenAt: new Date(
      new Date(replyBody.writtenAt).getTime() - 60_000,
    ).toISOString(),
  };

  const delayedResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    stewardToken,
    "POST",
    delayedStewardBody,
  );
  assert.equal(delayedResponse.status, 201);

  const delayedMessage = (await delayedResponse.json()) as {
    id: number;
    sender: string;
    writtenAt: string;
    receivedAt: string;
  };

  // The thread follows server receive order, not the message's writtenAt time.
  assert.equal(delayedMessage.sender, "STATION");
  assert.ok(
    Date.parse(delayedMessage.writtenAt) < Date.parse(replyMessage.writtenAt),
  );
  assert.ok(
    Date.parse(delayedMessage.receivedAt) > Date.parse(replyMessage.receivedAt),
  );

  const delayedThreadResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}`,
    operatorToken,
  );
  assert.equal(delayedThreadResponse.status, 200);

  const delayedThread = (await delayedThreadResponse.json()) as {
    state: string;
    unansweredSince: string | null;
    messages: {
      id: number;
      sender: string;
      writtenAt: string;
      receivedAt: string;
    }[];
  };

  assert.equal(delayedThread.state, "UNANSWERED");
  assert.equal(delayedThread.unansweredSince, delayedMessage.receivedAt);
  assert.equal(delayedThread.messages.at(-1)?.id, delayedMessage.id);
  assert.deepEqual(
    delayedThread.messages.map((message) => message.id),
    [...delayedThread.messages]
      .map((message) => message.id)
      .sort((a, b) => a - b),
  );

  // Checking out removes the steward's permission to read or send.
  const checkout = await api("/api/v1/position-reports", stewardToken, "POST", {
    activationId: activation.activationId,
    staff: "ignored-by-server",
    station,
    reportedAt: new Date().toISOString(),
    event: "CHECKED_OUT",
  });
  assert.equal(checkout.status, 202);

  const afterCheckout = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    stewardToken,
    "POST",
    { ...messageBody, clientMessageId: randomUUID() },
  );
  assert.equal(afterCheckout.status, 409);
  assert.equal(
    ((await afterCheckout.json()) as { error: { code: string } }).error.code,
    "E1007",
  );

  const stoodDown = await api(
    `/api/v1/activations/${activation.activationId}/stand-down`,
    operatorToken,
    "POST",
  );
  assert.equal(stoodDown.status, 200);

  const afterStandDown = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}/messages`,
    operatorToken,
    "POST",
    { ...replyBody, clientMessageId: randomUUID() },
  );
  assert.equal(afterStandDown.status, 409);
  assert.equal(
    ((await afterStandDown.json()) as { error: { code: string } }).error.code,
    "E1003",
  );

  const newActivationResponse = await api(
    "/api/v1/scenarios/DEMO-003/activate",
    operatorToken,
    "POST",
    {},
  );
  assert.equal(newActivationResponse.status, 201);

  const newActivation = (await newActivationResponse.json()) as {
    activationId: number;
  };

  assert.notEqual(newActivation.activationId, activation.activationId);

  const emptyThreadResponse = await api(
    `/api/v1/station-threads/${encodeURIComponent(station)}`,
    operatorToken,
  );
  assert.equal(emptyThreadResponse.status, 200);

  const emptyThread = (await emptyThreadResponse.json()) as {
    activationId: number;
    state: string;
    messages: unknown[];
  };
  assert.equal(emptyThread.activationId, newActivation.activationId);
  assert.equal(emptyThread.state, "ANSWERED");
  assert.deepEqual(emptyThread.messages, []);

  const cleanUp = await api(
    `/api/v1/activations/${newActivation.activationId}/stand-down`,
    operatorToken,
    "POST",
  );
  assert.equal(cleanUp.status, 200);
});
