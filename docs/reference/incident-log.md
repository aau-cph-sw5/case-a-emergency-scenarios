# Incident log

The incident log records every state-changing action as an event: what
happened, who did it, what it was about, and when. It is used to analyse an
incident afterwards. Events are only ever added, never changed or deleted.

The log is the `incident_events` table (`src/db/migrations/V003__create_incident_events.sql`).
All code writes to it through one function, `appendEvent` in
`src/services/incident-log-service.ts`.

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
- A new type needs no migration. Start writing it, and add it to this page.
- `schema_version` belongs to the type. Raise it when the type's payload
  changes shape. Old events keep their version, so readers check it before
  reading the payload.

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

- `server_time` is set by the database clock (`clock_timestamp()`) and can't be
  supplied by a caller.
- `client_time` is optional and is what the device claims.
- Order events by `sequence`, not by time.

## Known limits

- Two operators can't be told apart, because they share one login.
- `sequence` reflects arrival at the server, not the order things happened. A
  report queued offline arrives late.
- `sequence` can have gaps (from rolled-back transactions), and with concurrent
  writes a higher number can be committed before a lower one.
- `activation_id` and `line` are not foreign keys.
