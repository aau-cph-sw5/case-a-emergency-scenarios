import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type { Db } from "../db/client.js";

export type StoredStationMessage = {
    id: number;
    clientMessageId: string;
    activationId: number;
    station: string;
    sender: "STATION" | "CONTROL_ROOM";
    text: string;
    writtenAt: Date;
    receivedAt: Date;
};

// The API uses timestamp strings, so convert the database dates here.
function toMessage(row: StoredStationMessage): StationMessage {
    return {
        ...row,
        writtenAt: row.writtenAt.toISOString(),
        receivedAt: row.receivedAt.toISOString(),
    };
}

export async function lockClientMessageId(
    db: Db,
    clientMessageId: string,
): Promise<void> {
    // Make requests with the same ID wait so a retry can't save twice.
    await db`
        SELECT pg_advisory_xact_lock(hashtext(${clientMessageId.toLowerCase()}))
    `;
}

export async function lockActivationForMessage(
    db: Db,
  activationId: number,
): Promise<void> {
  // Keep the activation from being stood down while this message is saved.
  await db`
    SELECT id
    FROM incident_activations
    WHERE id = ${activationId}
    FOR SHARE
  `;
}

export async function lockStationThread(
  db: Db,
  activationId: number,
  station: string,
): Promise<void> {
  // Make messages in this thread wait their turn so they stay in order.
  await db`
    SELECT pg_advisory_xact_lock(
      hashtext(${`${activationId}:${station}`})
    )
  `;
}

export async function lockStewardPosition(
  db: Db,
  userId: number,
): Promise<void> {
  // Use the position-report lock so check-in can't change during this request.
  await db`
    SELECT pg_advisory_xact_lock(hashtext(${String(userId)}))
  `;
}

export async function findByClientMessageId(
  db: Db,
  clientMessageId: string,
): Promise<StoredStationMessage | null> {
  const [row] = await db<StoredStationMessage[]>`
    SELECT id, client_message_id, activation_id, station, sender,
           text, written_at, received_at
    FROM station_messages
    WHERE client_message_id = ${clientMessageId}
  `;
  return row ?? null;
}

export async function stationIsRequired(
  db: Db,
  activationId: number,
  station: string,
): Promise<boolean> {
  // Check the stations required by this activation's scenario version.
  const [row] = await db<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM incident_activations a
      JOIN station_requirements r
        ON r.scenario_version_id = a.scenario_version_id
      JOIN stations s ON s.id = r.station_id
      WHERE a.id = ${activationId}
        AND s.code = ${station}
    ) AS exists
  `;
  return row.exists;
}

export async function stewardIsCheckedIn(
  db: Db,
  userId: number,
  activationId: number,
  station: string,
): Promise<boolean> {
    // Use the newest report; older reports don't show the steward's current status.
    const [latest] = await db<
    { station: string; event: string; taskDone: boolean }[]
  >`
    SELECT station, event, task_done
    FROM position_reports
    WHERE staff = ${String(userId)}
      AND activation_id = ${activationId}
    ORDER BY received_at DESC, id DESC
    LIMIT 1
  `;

  return (
    latest?.station === station &&
    latest.event === "ARRIVED" &&
    latest.taskDone === false
  );
}

export async function insertStationMessage(
  db: Db,
  input: {
    clientMessageId: string;
    activationId: number;
    station: string;
    sender: "STATION" | "CONTROL_ROOM";
    text: string;
    writtenAt: Date;
  },
): Promise<StationMessage> {
  // Keep when the sender wrote the message; the database records when it arrived.
  const [row] = await db<StoredStationMessage[]>`
    INSERT INTO station_messages
      (client_message_id, activation_id, station, sender, text, written_at)
    VALUES
      (${input.clientMessageId}, ${input.activationId}, ${input.station},
       ${input.sender}, ${input.text}, ${input.writtenAt})
    RETURNING id, client_message_id, activation_id, station, sender,
              text, written_at, received_at
  `;
  return toMessage(row);
}

export async function listMessages(
  db: Db,
  activationId: number,
  station?: string,
): Promise<StationMessage[]> {
  // If no station is given, load messages for every station in this activation.
  const rows =
    station === undefined
      ? await db<StoredStationMessage[]>`
          SELECT id, client_message_id, activation_id, station, sender,
                 text, written_at, received_at
          FROM station_messages
          WHERE activation_id = ${activationId}
          ORDER BY id
        `
      : await db<StoredStationMessage[]>`
          SELECT id, client_message_id, activation_id, station, sender,
                 text, written_at, received_at
          FROM station_messages
          WHERE activation_id = ${activationId}
            AND station = ${station}
             ORDER BY id
        `;

  // These IDs keep the messages in the order they were saved.
  return rows.map(toMessage);
}