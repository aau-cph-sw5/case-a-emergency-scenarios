import type { Db } from "../db/client.js";
import {
  insertEvent,
  listEventsForActivation,
  type EventPayload,
  type IncidentEvent,
} from "../repositories/incident-event-repository.js";
import type { AuthUser } from "./auth-service.js";

// What a feature passes in. There's no actor, id, sequence or time here:
// the actor comes from the verified token, and the rest from the database.
export type NewIncidentEvent = {
  type: string; // SCREAMING_SNAKE_CASE, past tense, e.g. "SCENARIO_ACTIVATED"
  schemaVersion: number; // version of this type's payload shape
  subject: { type: string; id: string };
  activationId?: string;
  line?: string;
  payload?: EventPayload; // Data for this event, as allowed by its contract.
  clientTime?: Date; // the device's own time, e.g. for queued steward reports
};

// The single write entry point for the incident log. Pass the transaction that
// makes the change being recorded, so the change and its event commit together.
export async function appendEvent(
  db: Db,
  user: AuthUser,
  event: NewIncidentEvent,
): Promise<IncidentEvent> {
  return insertEvent(db, {
    type: event.type,
    schemaVersion: event.schemaVersion,
    actorType: "USER",
    actorId: String(user.userId),
    actorRole: user.role,
    subjectType: event.subject.type,
    subjectId: event.subject.id,
    activationId: event.activationId ?? null,
    line: event.line ?? null,
    payload: event.payload ?? {},
    clientTime: event.clientTime ?? null,
  });
}

export function listIncidentEvents(
  db: Db,
  activationId: string,
): Promise<IncidentEvent[]> {
  return listEventsForActivation(db, activationId);
}

// Log the message without identifying the steward who sent it.
export async function appendStationMessageEvent(
  db: Db,
  input: {
    message: {
      id: number;
      activationId: number;
      station: string;
      text: string;
      writtenAt: string;
      receivedAt: string;
    };
    lineGroup: string;
  },
): Promise<IncidentEvent> {
  const { message } = input;

  return insertEvent(db, {
    type: "STATION_MESSAGE_WRITTEN",
    schemaVersion: 1,
    // Use a fixed system actor instead of the steward's user ID, so it doesn't reveal the sender's identity.
    actorType: "SYSTEM",
    actorId: "station-thread",
    actorRole: null,
    subjectType: "station-message",
    subjectId: String(message.id),
    activationId: String(message.activationId),
    line: input.lineGroup,
    payload: {
      station: message.station,
      text: message.text,
      writtenAt: message.writtenAt,
      receivedAt: message.receivedAt,
    },
    // Keep the sender's written time; the database records the event's server time.
    clientTime: new Date(message.writtenAt),
  });
}
