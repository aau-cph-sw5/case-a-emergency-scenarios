import type { LineGroup } from "../../shared/auth/line-groups.js";
import type { StationMessage } from "../../shared/types/v1/station-message.js";
import type { Db } from "../db/client.js";

type StoredStationMessage = {
  id: number;
  clientMessageId: string;
  activationId: number;
  station: string;
  sender: StationMessage["sender"];
  text: string;
  writtenAt: Date;
  receivedAt: Date;
};

// The API uses timestamp strings, so convert the database dates here.
function toMessage(row: StoredStationMessage): StationMessage {
  return {
    id: row.id,
    clientMessageId: row.clientMessageId,
    activationId: row.activationId,
    station: row.station,
    sender: row.sender,
    text: row.text,
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

export async function lockActivationForLineGroup(
  db: Db,
  activationId: number,
  lineGroup: LineGroup,
): Promise<{
  activationId: number;
  lineGroup: LineGroup;
  active: boolean;
} | null> {
  // Lock the activation row for share so stand-down waits until this message commits.
  const [row] = await db<
    { activationId: number; lineGroup: LineGroup; deactivatedAt: Date | null }[]
  >`
    SELECT id AS activation_id, line_group, deactivated_at
    FROM incident_activations
    WHERE id = ${activationId}
      AND line_group = ${lineGroup}
    FOR SHARE
  `;
  if (!row) return null;
  return {
    activationId: row.activationId,
    lineGroup: row.lineGroup,
    active: row.deactivatedAt === null,
  };
}

export async function hasActiveActivation(
  db: Db,
  lineGroup: LineGroup,
): Promise<boolean> {
  const [row] = await db<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM incident_activations
      WHERE line_group = ${lineGroup}
        AND deactivated_at IS NULL
    ) AS exists
  `;
  return row.exists;
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
): Promise<{ message: StationMessage; lineGroup: LineGroup } | null> {
  const [row] = await db<(StoredStationMessage & { lineGroup: LineGroup })[]>`
    SELECT m.id, m.client_message_id, m.activation_id, m.station, m.sender,
           m.text, m.written_at, m.received_at, a.line_group
    FROM station_messages m
    JOIN incident_activations a ON a.id = m.activation_id
    WHERE m.client_message_id = ${clientMessageId}
  `;
  return row ? { message: toMessage(row), lineGroup: row.lineGroup } : null;
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

export async function findCheckedInStation(
  db: Db,
  userId: number,
  activationId: number,
): Promise<string | null> {
  const [lastest] = await db<
    { station: string; event: string; taskDone: boolean }[]
  >`
    SELECT station, event, task_done
    FROM position_reports
    WHERE staff = ${String(userId)}
      AND activation_id = ${activationId}
    ORDER BY received_at DESC, id DESC
    LIMIT 1
  `;
  return lastest?.event === "ARRIVED" && lastest.taskDone === false
    ? lastest.station
    : null;
}

export async function stewardIsCheckedIn(
  db: Db,
  userId: number,
  activationId: number,
  station: string,
): Promise<boolean> {
  return (await findCheckedInStation(db, userId, activationId)) === station;
}

export async function insertStationMessage(
  db: Db,
  input: {
    clientMessageId: string;
    activationId: number;
    station: string;
    sender: StationMessage["sender"];
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
