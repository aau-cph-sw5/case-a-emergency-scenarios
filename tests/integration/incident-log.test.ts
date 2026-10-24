import "dotenv/config";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { getDatabase } from "../../src/db/client.js";
import { requireAuth } from "../../src/middleware/require-auth.js";
import { login, type AuthUser } from "../../src/services/auth-service.js";
import { seedTestUsers } from "../../scripts/seed-test-users.js";
import {
  appendEvent,
  listIncidentEvents,
} from "../../src/services/incident-log-service.js";
import { anEvent, inRolledBackTransaction } from "./helpers.js";

const sql = getDatabase();
const OPERATOR_USERNAME = "incident-log-operator-test";
let operator: AuthUser;

before(async () => {
  const users = await seedTestUsers("incident-log-");
  const seededOperator = users.find(
    (user) => user.username === OPERATOR_USERNAME,
  );

  if (!seededOperator) {
    throw new Error("The incident-log operator test user was not seeded.");
  }

  operator = {
    userId: seededOperator.id,
    role: "OPERATOR",
    jti: randomUUID(),
  };
});

after(() => sql.end());

test("an event is stored with the actor from the user and the server's time", () =>
  inRolledBackTransaction(async (tx) => {
    const clientTime = new Date("2026-10-16T12:02:15Z");

    const event = await appendEvent(tx, operator, anEvent({ clientTime }));

    assert.equal(event.type, "SCENARIO_ACTIVATED");
    assert.equal(event.schemaVersion, 1);
    assert.equal(event.actorType, "USER");
    assert.equal(event.actorId, String(operator.userId));
    assert.equal(event.actorRole, "OPERATOR");
    assert.equal(event.subjectType, "activation");
    assert.equal(event.subjectId, "ACT-TEST-1");
    assert.equal(event.activationId, "ACT-TEST-1");
    assert.equal(event.line, "M1");
    assert.deepEqual(event.payload, { scenarioId: "DEMO-001", some_key: 1 });
    assert.equal(event.clientTime?.toISOString(), clientTime.toISOString());
    assert.ok(Math.abs(event.serverTime.getTime() - Date.now()) < 60_000);
  }));

test("an actor in the request body is ignored; the token decides", async () => {
  // A route that passes the whole request body to appendEvent, the way a
  // careless endpoint might.
  const app = express();
  app.use(express.json());
  app.post("/test/events", requireAuth, async (request, response) => {
    await inRolledBackTransaction(async (tx) => {
      const event = await appendEvent(tx, response.locals.user, request.body);
      response.status(201).json(event);
    });
  });

  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const session = await login(
      OPERATOR_USERNAME,
      "operator-test-pw",
      "OPERATOR",
    );
    assert.ok(session);

    const response = await fetch(`http://127.0.0.1:${port}/test/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        ...anEvent(),
        actorId: "steward-test",
        actorRole: "STEWARD",
      }),
    });

    assert.equal(response.status, 201);
    const event = await response.json();
    assert.equal(event.actorId, String(operator.userId));
    assert.equal(event.actorRole, "OPERATOR");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("a previously unknown event type is stored without a migration", () =>
  inRolledBackTransaction(async (tx) => {
    const type = `TEST_UNKNOWN_${randomUUID().slice(0, 8).toUpperCase()}`;

    const event = await appendEvent(tx, operator, anEvent({ type }));

    assert.equal(event.type, type);
  }));

test("events for an activation are returned in sequence order", () =>
  inRolledBackTransaction(async (tx) => {
    const activationId = `ACT-TEST-${randomUUID()}`;
    const types = [
      "SCENARIO_ACTIVATED",
      "STATION_COVERED",
      "SCENARIO_STOOD_DOWN",
    ];
    for (const type of types) {
      await appendEvent(tx, operator, anEvent({ type, activationId }));
    }

    const events = await listIncidentEvents(tx, activationId);

    assert.deepEqual(
      events.map((event) => event.type),
      types,
    );
  }));

test("an event with only the required fields leaves the optional ones empty", () =>
  inRolledBackTransaction(async (tx) => {
    const event = await appendEvent(tx, operator, {
      type: "SCENARIO_ACTIVATED",
      schemaVersion: 1,
      subject: { type: "activation", id: "ACT-TEST-1" },
    });

    assert.equal(event.activationId, null);
    assert.equal(event.line, null);
    assert.deepEqual(event.payload, {});
    assert.equal(event.clientTime, null);
  }));
