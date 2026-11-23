import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { getDatabase, type Db } from "../../src/db/client.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import {
  appendEvent,
  type NewIncidentEvent,
} from "../../src/services/incident-log-service.js";
import {
  anEvent,
  closeOwnerDatabase,
  getOwnerDatabase,
  inRolledBackTransaction,
} from "./helpers.js";

const sql = getDatabase();
const operator: AuthUser = { userId: "operator-test", role: "OPERATOR" };

// PostgreSQL's restrict_violation, which the append-only trigger raises.
const RESTRICT_VIOLATION = "23001";

// The trigger tests run as the owner. The application's role is refused by its
// grants before the trigger fires, which app-role-privileges.test.ts covers.
// Here the trigger must hold for a user that has the privileges.
const owner = getOwnerDatabase();

after(async () => {
  await sql.end();
  await closeOwnerDatabase();
});

// The failing statement runs in a savepoint, so the transaction survives it and
// the test can check that the row is unchanged afterwards.
function refused(tx: Db, statement: (db: Db) => PromiseLike<unknown>) {
  return assert.rejects(
    tx.savepoint((savepoint) => statement(savepoint as unknown as Db)),
    (error: unknown) =>
      (error as { code?: string }).code === RESTRICT_VIOLATION &&
      /append-only/.test((error as Error).message),
  );
}

test("an event cannot be updated", () =>
  inRolledBackTransaction(async (tx) => {
    const event = await appendEvent(tx, operator, anEvent());

    await refused(
      tx,
      (db) =>
        db`UPDATE incident_events SET type = 'TAMPERED' WHERE id = ${event.id}`,
    );
    await refused(
      tx,
      (db) =>
        db`UPDATE incident_events SET actor_id = 'someone-else' WHERE id = ${event.id}`,
    );

    const [stored] = await tx<{ type: string; actorId: string }[]>`
      SELECT type, actor_id FROM incident_events WHERE id = ${event.id}
    `;
    assert.equal(stored.type, "SCENARIO_ACTIVATED");
    assert.equal(stored.actorId, "operator-test");
  }, owner));

test("an event cannot be deleted", () =>
  inRolledBackTransaction(async (tx) => {
    const event = await appendEvent(tx, operator, anEvent());

    await refused(
      tx,
      (db) => db`DELETE FROM incident_events WHERE id = ${event.id}`,
    );

    const stored =
      await tx`SELECT 1 FROM incident_events WHERE id = ${event.id}`;
    assert.equal(stored.length, 1);
  }, owner));

test("the log cannot be truncated", () =>
  inRolledBackTransaction(async (tx) => {
    const event = await appendEvent(tx, operator, anEvent());

    await refused(tx, (db) => db`TRUNCATE incident_events`);

    const stored =
      await tx`SELECT 1 FROM incident_events WHERE id = ${event.id}`;
    assert.equal(stored.length, 1);
  }, owner));

test("a client-supplied time is stored only in client_time", () =>
  inRolledBackTransaction(async (tx) => {
    const clientTime = new Date("2001-01-01T00:00:00Z");

    const event = await appendEvent(tx, operator, { ...anEvent(), clientTime });

    assert.equal(event.clientTime?.toISOString(), clientTime.toISOString());
    // The server's own clock decided server_time, not the client's.
    assert.ok(Math.abs(event.serverTime.getTime() - Date.now()) < 60_000);
  }));

test("a server time, id or sequence in the event is ignored", () =>
  inRolledBackTransaction(async (tx) => {
    // What a careless endpoint passes on when it forwards the request body.
    const smuggled = {
      ...anEvent(),
      serverTime: new Date("2001-01-01T00:00:00Z"),
      server_time: new Date("2001-01-01T00:00:00Z"),
      id: "00000000-0000-0000-0000-000000000000",
      sequence: "999999999999",
    } as NewIncidentEvent;

    const event = await appendEvent(tx, operator, smuggled);

    assert.ok(Math.abs(event.serverTime.getTime() - Date.now()) < 60_000);
    assert.notEqual(event.id, "00000000-0000-0000-0000-000000000000");
    assert.notEqual(event.sequence, "999999999999");
    assert.equal(event.clientTime, null);
  }));
