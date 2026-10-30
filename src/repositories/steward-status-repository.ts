import type { Db } from "../db/client.js";
import type { StewardStatusValue } from "../../shared/types/v1/steward-status.js";

// A row of steward_statuses. The response shape is StewardStatus in
// shared/types/v1; the status values come from there too.
export type StoredStewardStatus = {
  activationSequence: string; // BIGINT
  activationId: string;
  userId: number;
  station: string;
  status: StewardStatusValue;
  changedAt: Date;
};

export type StatusKey = {
  activationSequence: number;
  activationId: string;
  userId: number;
};

export async function findStatus(
  db: Db,
  key: StatusKey,
): Promise<StoredStewardStatus | null> {
  const [found] = await db<StoredStewardStatus[]>`
    SELECT * FROM steward_statuses
    WHERE activation_sequence = ${key.activationSequence}
      AND user_id = ${key.userId}
  `;
  return found ?? null;
}

// The first status in an activation. Null if another request inserted one
// first.
export async function insertFirstStatus(
  db: Db,
  key: StatusKey,
  next: { status: StewardStatusValue; station: string },
): Promise<StoredStewardStatus | null> {
  const [inserted] = await db<StoredStewardStatus[]>`
    INSERT INTO steward_statuses
      (activation_sequence, activation_id, user_id, station, status)
    VALUES (${key.activationSequence}, ${key.activationId}, ${key.userId},
            ${next.station}, ${next.status})
    ON CONFLICT (activation_sequence, user_id) DO NOTHING
    RETURNING *
  `;
  return inserted ?? null;
}

// Changes the status only if it is still the one that was read, so of two
// concurrent changes only one is made. Null if the other got there first.
export async function updateStatusIf(
  db: Db,
  current: StoredStewardStatus,
  next: { status: StewardStatusValue; station: string },
): Promise<StoredStewardStatus | null> {
  const [updated] = await db<StoredStewardStatus[]>`
    UPDATE steward_statuses
    SET status = ${next.status}, station = ${next.station},
        changed_at = clock_timestamp()
    WHERE activation_sequence = ${current.activationSequence}
      AND user_id = ${current.userId}
      AND status = ${current.status}
      AND station = ${current.station}
    RETURNING *
  `;
  return updated ?? null;
}

export function listStatuses(
  db: Db,
  activationSequence: number,
): Promise<StoredStewardStatus[]> {
  return db<StoredStewardStatus[]>`
    SELECT * FROM steward_statuses
    WHERE activation_sequence = ${activationSequence}
    ORDER BY changed_at
  `;
}
