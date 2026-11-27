import { getDatabase, type Db } from "../db/client.js";
import type { LineGroup } from "../../shared/auth/line-groups.js";
import { RENEWAL_WINDOW_MS } from "../../shared/auth/renewal.js";

export type AuthSession = {
  userId: number;
  jti: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

async function startSession(
  userId: number,
  jti: string,
  expiresAt: Date,
): Promise<AuthSession> {
  const sql = getDatabase();
  const result = await sql<AuthSession[]>`
    INSERT INTO auth_sessions (user_id, jti, expires_at)
    VALUES (${userId}, ${jti}, ${expiresAt})
    ON CONFLICT (user_id) DO UPDATE
    SET
      jti = EXCLUDED.jti,
      expires_at = EXCLUDED.expires_at,
      revoked_at = NULL,
      created_at = CURRENT_TIMESTAMP,
      push_token = NULL
    RETURNING
      user_id AS "userId",
      jti,
      expires_at AS "expiresAt",
      revoked_at AS "revokedAt"
  `;
  return result[0];
}

async function extendDueSession(
  userId: number,
  jti: string,
  expiresAt: Date,
): Promise<AuthSession | null> {
  const sql = getDatabase();
  const result = await sql<AuthSession[]>`
    UPDATE auth_sessions
    SET expires_at = ${expiresAt}
    WHERE user_id = ${userId}
      AND jti = ${jti}
      AND revoked_at IS NULL
      AND expires_at > NOW()
      AND expires_at <= NOW() + ${RENEWAL_WINDOW_MS} * INTERVAL '1 millisecond'
    RETURNING
      user_id AS "userId",
      jti,
      expires_at AS "expiresAt",
      revoked_at AS "revokedAt"
  `;
  return result[0] || null;
}

async function findActiveSession(
  userId: number,
  jti: string,
): Promise<AuthSession | null> {
  const sql = getDatabase();
  const result = await sql<AuthSession[]>`
    SELECT
      user_id AS "userId",
      jti,
      expires_at AS "expiresAt",
      revoked_at AS "revokedAt"
    FROM auth_sessions
    WHERE user_id = ${userId}
      AND jti = ${jti}
      AND revoked_at IS NULL
      AND expires_at > NOW()
  `;
  return result[0] || null;
}

async function revokeSession(userId: number, jti: string): Promise<void> {
  const sql = getDatabase();
  await sql`
    UPDATE auth_sessions
    SET revoked_at = CURRENT_TIMESTAMP, push_token = NULL
    WHERE user_id = ${userId}
      AND jti = ${jti}
      AND revoked_at IS NULL
  `;
}

async function revokeAllSessionsForUser(
  userId: number,
  db: Db = getDatabase(),
): Promise<void> {
  await db`
    UPDATE auth_sessions
    SET revoked_at = CURRENT_TIMESTAMP, push_token = NULL
    WHERE user_id = ${userId} AND revoked_at IS NULL
  `;
}

// A phone has one token, so another account's session that still holds it
// loses it: the phone only gets notifications for whoever is logged in on it.
async function savePushToken(
  userId: number,
  jti: string,
  pushToken: string,
): Promise<boolean> {
  return getDatabase().begin(async (tx) => {
    // Two logins on one phone claim its token one after the other
    await tx`SELECT pg_advisory_xact_lock(hashtext(${pushToken}))`;
    const saved = await tx`
      UPDATE auth_sessions
      SET push_token = ${pushToken}
      WHERE user_id = ${userId}
        AND jti = ${jti}
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `;
    // An ended session takes the token from nobody
    if (saved.count !== 1) return false;
    await tx`
      UPDATE auth_sessions
      SET push_token = NULL
      WHERE push_token = ${pushToken} AND user_id <> ${userId}
    `;
    return true;
  });
}

// The phones of the stewards logged in to a line group (ADR 0014).
async function findStewardPushTokens(lineGroup: LineGroup): Promise<string[]> {
  const sql = getDatabase();
  const rows = await sql<{ pushToken: string }[]>`
    SELECT s.push_token AS "pushToken"
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE u.role = 'STEWARD'
      AND u.line_group = ${lineGroup}
      AND u.deleted_at IS NULL
      AND NOT u.is_disabled
      AND s.push_token IS NOT NULL
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
  `;
  return rows.map((row) => row.pushToken);
}

// The phones of the stewards checked in at a station, except the sender's
// (#414). "Checked in" must match findCheckedInStation in
// station-message-repository.ts, which decides who may read the station chat:
// the steward's newest position report for the activation is an ARRIVED with
// the task not done. Change both together.
async function findStationStewardPushTokens(
  activationId: number,
  station: string,
  excludeUserId: number | null,
): Promise<string[]> {
  const sql = getDatabase();
  const rows = await sql<{ pushToken: string }[]>`
    WITH latest AS (
      SELECT DISTINCT ON (staff) staff, station, event, task_done
      FROM position_reports
      WHERE activation_id = ${activationId}
      ORDER BY staff, received_at DESC, id DESC
      )
    SELECT s.push_token AS "pushToken"
    FROM latest l
    JOIN auth_sessions s ON s.user_id = l.staff::int
    JOIN users u ON u.id = s.user_id
    WHERE l.station = ${station}
      AND l.event = 'ARRIVED' AND l.task_done = false
      AND u.role = 'STEWARD'
      AND u.deleted_at IS NULL
      AND NOT u.is_disabled
      AND (${excludeUserId}::int IS NULL OR s.user_id <> ${excludeUserId})
      AND s.push_token IS NOT NULL
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
  `;
  return rows.map((r) => r.pushToken);
}

// FCM answered that these phones no longer take messages.
async function clearPushTokens(pushTokens: string[]): Promise<void> {
  if (pushTokens.length === 0) return;
  const sql = getDatabase();
  await sql`
    UPDATE auth_sessions
    SET push_token = NULL
    WHERE push_token IN ${sql(pushTokens)}
  `;
}

export const authSessionRepository = {
  startSession,
  extendDueSession,
  findActiveSession,
  revokeSession,
  revokeAllSessionsForUser,
  savePushToken,
  findStewardPushTokens,
  clearPushTokens,
  findStationStewardPushTokens,
};
