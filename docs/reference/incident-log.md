# Incident log

The incident log records every state-changing action as an event: what
happened, who did it, what it was about, and when. It is used to analyse an
incident afterwards. The application only ever adds events and it has no way to change or delete them.

The log is the `incident_events` table (`src/db/migrations/V005__create_incident_events.sql`).
All code writes to it through one function, `appendEvent` in
`src/services/incident-log-service.ts`.

## Append-only

The database itself refuses to change the log. A trigger
(`src/db/migrations/V007__incident_events_append_only.sql`) rejects `UPDATE`,
`DELETE` and `TRUNCATE` on `incident_events` with error `23001`
(`restrict_violation`) and the message "incident_events is append-only". The
application, a script and a direct SQL connection all hit it, whichever
database user they connect as.

A mistaken event is not corrected by editing it. Write a new event that
records the correction.

The trigger is a safeguard, not tamper-proofing. The table owner and
superusers can get around it, the application can't (see
[Database roles](#database-roles)):

- `DROP TRIGGER` or `ALTER TABLE incident_events DISABLE TRIGGER ...`, which a
  later migration can do too, because Flyway connects as the owner. A
  migration that touches the trigger needs a careful review.
- `SET session_replication_role = replica` (superuser), which switches
  triggers off for the session.
- `ALTER TABLE ... ALTER COLUMN ... TYPE` and similar statements that rewrite
  the table, which don't fire row-level triggers.
- `DROP TABLE` and `DROP SCHEMA`. `npm run db:test:reset` relies on this
  (Flyway `clean`), and `npm run db:reset` deletes the local Docker volume.

Real tamper-evidence against those users needs controls outside the
application, such as restricting who may connect as the owner on the hosted
environments.

## Database roles

Two database users connect, so a compromised or careless application
connection can't remove the protection above:

| Role | Used by | Can |
|---|---|---|
| Owner (`FLYWAY_USER` on the hosted environments, `metro` locally) | Flyway, the seed scripts, and test fixtures | Everything on its own tables, including dropping the triggers |
| `metro_app` | The application (`DATABASE_URL`) | Only the privileges below |

`metro_app` is created by `V008__create_app_role.sql` without a password and
without a login. A password can't be committed, so each environment makes the
role usable once, outside Flyway. Locally and in tests `docker/db-init/` does
it; on staging and production see "Database roles" in `COMMANDS.md`.

What `metro_app` may do with the tables that exist:

| Table | `metro_app` may |
|---|---|
| `incident_events` | `SELECT`, `INSERT`. Not `UPDATE`, `DELETE` or `TRUNCATE`, and it isn't the owner, so it can't `DISABLE TRIGGER` or `DROP TRIGGER` either |
| `auth_sessions` | `SELECT`, `INSERT`, `UPDATE` |
| `position_reports` | `SELECT`, `INSERT` |
| `users` | `SELECT`. Accounts are created by `npm run seed:users` |
| Scenario reference data (`scenarios`, `scenario_versions`, `stations`, `track_segments`, `scenario_covers`, `operating_plans`, `operating_patterns`, `line_stops`, `station_requirements`, `staffing_windows`, `actions`, `passenger_information`) | `SELECT`. `npm run seed` loads them as the owner |

### A new table

`V008` sets default privileges, so a table created by a later migration gives
`metro_app` `SELECT`, `INSERT`, `UPDATE` and `DELETE`, and its sequences
`USAGE` and `SELECT`. The migration doesn't have to grant anything.

A table that should give less, like an event log or another append-only table,
revokes the rest in its own migration:

```sql
REVOKE UPDATE, DELETE, TRUNCATE ON my_log FROM metro_app;
```

and is listed in `expected` in `tests/integration/app-role-privileges.test.ts`.
That test fails when a table has other privileges than the ones listed here
(unlisted tables must have the default four), and when the default privileges
stop working.

The application's role is also refused `CREATE`, `ALTER` and `DROP` on the
owner's tables, which is what stops it from disabling the triggers. A
statement run as `metro_app` fails with `42501` (`insufficient_privilege`).
The trigger's own error, `23001`, is for the owner, and the two are tested
separately.

## Writing an event

Call `appendEvent` with the transaction that makes the change, the verified
user, and the event. The change and its event then commit together, or not at
all.

```ts
import { getDatabase } from "../db/client.js";
import { appendEvent } from "../services/incident-log-service.js";

await getDatabase().begin(async (tx) => {
  // ... the change being recorded, written with tx ...

  await appendEvent(tx, response.locals.user, {
    type: "SCENARIO_ACTIVATED",
    schemaVersion: 1,
    subject: { type: "activation", id: activationId },
    activationId,
    line: "M1",
    payload: { scenarioId: "DEMO-001" },
  });
});
```

Don't insert into `incident_events` directly, and don't import
`incident-event-repository.ts` outside the service.

To read the events of one activation in order, use
`listIncidentEvents(db, activationId)`.

## Schema v1

| Column | Type | Set by | Meaning |
|---|---|---|---|
| `id` | UUID | database | Unique id of the event |
| `sequence` | BIGINT | database | Order in which events arrived at the server |
| `type` | TEXT | caller | What happened, e.g. `SCENARIO_ACTIVATED` |
| `schema_version` | INT | caller | Version of this type's payload shape |
| `actor_type` | TEXT | service | `USER`, or `SYSTEM` for automatic actions |
| `actor_id` | TEXT | service | `userId` from the verified token |
| `actor_role` | TEXT | service | Role from the verified token. Empty for `SYSTEM` |
| `subject_type` | TEXT | caller | What kind of thing the event is about, e.g. `activation`, `station` |
| `subject_id` | TEXT | caller | Id of that thing |
| `activation_id` | TEXT | caller | The activation the event belongs to, if any |
| `line` | TEXT | caller | Metro line, e.g. `M1`, if any |
| `payload` | JSONB | caller | Details specific to the event type |
| `server_time` | TIMESTAMPTZ | database | When the server stored the event (UTC) |
| `client_time` | TIMESTAMPTZ | caller | The device's own time, if it sent one |

In TypeScript the columns are camelCase (`serverTime`, `actorId`), because
`getDatabase()` converts column names. Payload keys are not converted.

## Event types

- Names are SCREAMING_SNAKE_CASE and past tense: `SCENARIO_ACTIVATED`,
  `STATION_COVERED`. The database rejects other formats.
- A new type needs no migration. Start writing it, and add it to the table below.
- `schema_version` belongs to the type. Raise it when the type's payload
  changes shape. Old events keep their version, so readers check it before
  reading the payload.

### Known event types

Add a row when a feature starts writing a type. A payload change gets a new
row with the next version and the old row stays, because old events keep their
version. 

| Type | Version | Subject | Payload | Written by |
|---|---|---|---|---|
| `SCENARIO_ACTIVATED` | 1 | `activation` | `scenarioId` | `activateAndLog` in `src/services/activation-service.ts`. The activation is in memory, so it is undone if this write fails |
| `POSITION_REPORTED` | 1 | `position-report` | `stationId` | `savePositionReport` in `src/services/position-report-service.ts`, the worked example of `appendEvent` inside a transaction |
| `POSITION_REPORTED` | 2 | `position-report` | `stationId`, `taskDone` (true when the steward finished the task, MET-A-015) | `savePositionReport` in `src/services/position-report-service.ts` |

## Payload rules

- A JSON object with camelCase keys. The same thing always has the same key,
  e.g. `stationId`, `scenarioId`. Reuse an existing key before inventing one,
  so events can be queried across types and incidents.
- Ids and fixed codes only, e.g. `"EN_ROUTE"`. No names, no free text, no
  personal data: an event can never be removed again.
- Point to versioned ids when the thing referred to can change.
- Don't repeat what the columns already hold. In particular, never put an actor
  in the payload: the actor comes from the token.

## Actor rules

- `actor_id` is always the `userId` from the verified token. It is never taken
  from the request body and is never a name.
- `actor_role` comes from the same token.
- Operators share one control-room login, so an operator event identifies the
  position, not the person.
- Stewards have their own accounts, so a steward event identifies the account.
- A report queued offline keeps the steward who created it. The phone's time
  goes in `client_time`.
- `SYSTEM` is for actions no user performs. Nothing writes it yet.
- `actor_id` has no foreign key, so user accounts can be anonymised without
  touching the log.

## Time and order

- `server_time` is set by the database clock (`clock_timestamp()`).
  `appendEvent` has no way to pass it, so a caller can't supply it. The column
  is only a default, so a direct `INSERT` can still set it. Write events
  through `appendEvent`.
- `client_time` is optional and is what the device claims.
- Order events by `sequence`, not by time.
- `sequence` arrives in TypeScript as a string, so `"10" < "9"`. Let the
  database order events, or compare with `BigInt(...)`.


## Known limits

- Two operators can't be told apart, because they share one login.
- `sequence` reflects arrival at the server, not the order things happened. A
  report queued offline arrives late.
- `sequence` can have gaps (from rolled-back transactions), and with concurrent
  writes a higher number can be committed before a lower one.
- `activation_id` and `line` are not foreign keys.
- The owner can still change the log, because the owner can drop the triggers.
  The application can't. `metro_app` can still `INSERT` into `incident_events`
  directly, not only through `appendEvent`.
