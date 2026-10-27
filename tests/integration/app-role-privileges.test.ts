import "dotenv/config";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { getDatabase, type Db } from "../../src/db/client.js";
import type { AuthUser } from "../../src/services/auth-service.js";
import { appendEvent } from "../../src/services/incident-log-service.js";
import {
  anEvent,
  closeOwnerDatabase,
  getOwnerDatabase,
  inRolledBackTransaction,
} from "./helpers.js";

// The application's role. These tests connect as it (DATABASE_URL), so a
// permission error here comes from the grants and not from the append-only
// trigger. The trigger is tested in incident-log-append-only.test.ts.
const APP_ROLE = "metro_app";
const INSUFFICIENT_PRIVILEGE = "42501";
const RESTRICT_VIOLATION = "23001";

const sql = getDatabase();
const owner = getOwnerDatabase();
const operator: AuthUser = { userId: "operator-test", role: "OPERATOR" };

after(async () => {
  await sql.end();
  await closeOwnerDatabase();
});

// What the application may do with each table that exists today. A table that
// is not listed here gets the default privileges from V008: all four.
const ALL = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const expected: Record<string, string[]> = {
  incident_events: ["SELECT", "INSERT"],
  users: ["SELECT"],
  auth_sessions: ["SELECT", "INSERT", "UPDATE"],
  position_reports: ["SELECT", "INSERT"],
  scenarios: ["SELECT"],
  scenario_versions: ["SELECT"],
  stations: ["SELECT"],
  track_segments: ["SELECT"],
  scenario_covers: ["SELECT"],
  operating_plans: ["SELECT"],
  operating_patterns: ["SELECT"],
  line_stops: ["SELECT"],
  station_requirements: ["SELECT"],
  staffing_windows: ["SELECT"],
  actions: ["SELECT"],
  passenger_information: ["SELECT"],
};

// The failing statement runs in a savepoint, so the transaction survives it.
function denied(tx: Db, statement: (db: Db) => PromiseLike<unknown>) {
  return assert.rejects(
    tx.savepoint((savepoint) => statement(savepoint as unknown as Db)),
    (error: unknown) => {
      const { code, message } = error as { code?: string; message: string };
      // Not the trigger's error: the grants must hold without the trigger.
      assert.notEqual(code, RESTRICT_VIOLATION, message);
      return code === INSUFFICIENT_PRIVILEGE;
    },
  );
}

test("the application connects as the app role, not as the owner", async () => {
  const [{ currentUser }] = await sql<{ currentUser: string }[]>`
    SELECT current_user
  `;
  assert.equal(currentUser, APP_ROLE);
});

test("the app role can read and append to the incident log", () =>
  inRolledBackTransaction(async (tx) => {
    const event = await appendEvent(tx, operator, anEvent());

    const stored =
      await tx`SELECT 1 FROM incident_events WHERE id = ${event.id}`;
    assert.equal(stored.length, 1);
  }));

test("the app role cannot update the incident log", () =>
  inRolledBackTransaction(async (tx) => {
    await denied(tx, (db) => db`UPDATE incident_events SET type = 'TAMPERED'`);
  }));

test("the app role cannot delete from the incident log", () =>
  inRolledBackTransaction(async (tx) => {
    await denied(tx, (db) => db`DELETE FROM incident_events`);
  }));

test("the app role cannot truncate the incident log", () =>
  inRolledBackTransaction(async (tx) => {
    await denied(tx, (db) => db`TRUNCATE incident_events`);
  }));

test("the app role cannot disable or drop the append-only triggers", () =>
  inRolledBackTransaction(async (tx) => {
    await denied(
      tx,
      (db) => db`ALTER TABLE incident_events DISABLE TRIGGER ALL`,
    );
    await denied(
      tx,
      (db) =>
        db`ALTER TABLE incident_events DISABLE TRIGGER incident_events_reject_update_delete`,
    );
    await denied(
      tx,
      (db) =>
        db`DROP TRIGGER incident_events_reject_update_delete ON incident_events`,
    );
  }));

test("every table gives the app role exactly the privileges listed above", async () => {
  const tables = await owner<{ name: string }[]>`
    SELECT tablename AS name FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> 'flyway_schema_history'
  `;

  const actual: Record<string, string[]> = {};
  for (const { name } of tables) {
    actual[name] = [];
    for (const privilege of ALL) {
      const [{ allowed }] = await owner<{ allowed: boolean }[]>`
        SELECT has_table_privilege(${APP_ROLE}::name, ${`public.${name}`}::text, ${privilege}::text) AS allowed
      `;
      if (allowed) actual[name].push(privilege);
    }
  }

  // A new table that needs fewer privileges than the default has to say so
  // here and revoke the rest in its migration. See docs/reference/incident-log.md.
  const wanted = Object.fromEntries(
    tables.map(({ name }) => [name, expected[name] ?? ALL]),
  );
  assert.deepEqual(actual, wanted);
});

test("the app role cannot create tables or change the owner's tables", () =>
  inRolledBackTransaction(async (tx) => {
    await denied(
      tx,
      (db) => db`CREATE TABLE app_role_must_not_create (id INT)`,
    );
    await denied(tx, (db) => db`ALTER TABLE users ADD COLUMN extra TEXT`);
    await denied(tx, (db) => db`DROP TABLE position_reports`);
  }));

test("a table added by a later migration is usable by the app role", async () => {
  // Created by the owner, as a migration would. The transaction is rolled back.
  const probe = "app_role_default_privileges_probe";
  class Rollback extends Error {}

  await assert.rejects(
    owner.begin(async (tx) => {
      await tx.unsafe(
        `CREATE TABLE ${probe} (id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY)`,
      );

      for (const privilege of ALL) {
        const [{ allowed }] = await tx<{ allowed: boolean }[]>`
          SELECT has_table_privilege(${APP_ROLE}::name, ${probe}::text, ${privilege}::text) AS allowed
        `;
        assert.ok(allowed, `${APP_ROLE} lacks ${privilege} on a new table`);
      }
      throw new Rollback();
    }),
    Rollback,
  );
});
