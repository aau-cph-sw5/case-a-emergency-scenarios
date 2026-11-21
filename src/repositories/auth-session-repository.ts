import { getDatabase } from "../db/client.js";
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
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId}
      AND jti = ${jti}
      AND revoked_at IS NULL
  `;
}

async function revokeAllSessionsForUser(userId: number): Promise<void> {
  const sql = getDatabase();
  await sql`
    UPDATE auth_sessions
    SET revoked_at = CURRENT_TIMESTAMP
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
    await tx`
      UPDATE auth_sessions
      SET push_token = NULL
      WHERE push_token = ${pushToken} AND user_id <> ${userId}
    `;
    const result = await tx`
      UPDATE auth_sessions
      SET push_token = ${pushToken}
      WHERE user_id = ${userId}
        AND jti = ${jti}
        AND revoked_at IS NULL
        AND expires_at > NOW()
    `;
    return result.count === 1;
  });
}

// The phones of the stewards logged in to a line group (ADR 0014).
async function findStewardPushTokens(lineGroup: string): Promise<string[]> {
  const sql = getDatabase();
  const rows = await sql<{ pushToken: string }[]>`
    SELECT s.push_token AS "pushToken"
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE u.role = 'STEWARD'
      AND u.line_group = ${lineGroup}
      AND s.push_token IS NOT NULL
      AND s.revoked_at IS NULL
      AND s.expires_at > NOW()
  `;
  return rows.map((row) => row.pushToken);
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
};
