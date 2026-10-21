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
      created_at = CURRENT_TIMESTAMP
    RETURNING
      user_id AS "userId",
      jti,
      expires_at AS "expiresAt",
      revoked_at AS "revokedAt"
  `;
  return result[0];
}

async function replaceDueSession(
  userId: number,
  currentJti: string,
  newJti: string,
  expiresAt: Date,
): Promise<AuthSession | null> {
  const sql = getDatabase();
  const result = await sql<AuthSession[]>`
    UPDATE auth_sessions
    SET
      jti = ${newJti},
      expires_at = ${expiresAt},
      revoked_at = NULL,
      created_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId}
      AND jti = ${currentJti}
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

async function extendSession(
  userId: number,
  jti: string,
  newExpiresAt: Date,
): Promise<void> {
  const sql = getDatabase();
  await sql`
    UPDATE auth_sessions
    SET expires_at = ${newExpiresAt}
    WHERE user_id = ${userId}
      AND jti = ${jti}
      AND revoked_at IS NULL
      AND expires_at > NOW()
  `;
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

export const authSessionRepository = {
  startSession,
  replaceDueSession,
  findActiveSession,
  extendSession,
  revokeSession,
  revokeAllSessionsForUser,
};
