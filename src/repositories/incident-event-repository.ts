import type postgres from "postgres";
import type { Db } from "../db/client.js";
import type { Role } from "../services/auth-service.js";

// Only incident-log-service.ts may import this file. Everything else writes
// events through appendEvent, so the actor and clock rules live in one place.

export type EventPayload = {
  readonly [key: string]: postgres.JSONValue | undefined;
};

export type IncidentEvent = {
  id: string;
  sequence: string; // BIGINT arrives as a string from the postgres library
  type: string;
  schemaVersion: number;
  actorType: "USER" | "SYSTEM";
  actorId: string;
  actorRole: Role | null;
  subjectType: string;
  subjectId: string;
  activationId: string | null;
  line: string | null;
  payload: EventPayload;
  serverTime: Date;
  clientTime: Date | null;
};

// The database sets id, sequence and server_time. They can't be passed in.
export type NewIncidentEventRow = Omit<
  IncidentEvent,
  "id" | "sequence" | "serverTime"
>;

export async function insertEvent(
  db: Db,
  event: NewIncidentEventRow,
): Promise<IncidentEvent> {
  const [inserted] = await db<IncidentEvent[]>`
    INSERT INTO incident_events
      (type, schema_version, actor_type, actor_id, actor_role, subject_type,
       subject_id, activation_id, line, payload, client_time)
    VALUES
      (${event.type}, ${event.schemaVersion}, ${event.actorType}, ${event.actorId},
       ${event.actorRole}, ${event.subjectType}, ${event.subjectId},
       ${event.activationId}, ${event.line}, ${db.json(event.payload)},
       ${event.clientTime})
    RETURNING *
  `;
  return inserted;
}

export function listEventsForActivation(
  db: Db,
  activationId: string,
): Promise<IncidentEvent[]> {
  return db<IncidentEvent[]>`
    SELECT * FROM incident_events
    WHERE activation_id = ${activationId}
    ORDER BY sequence
  `;
}
