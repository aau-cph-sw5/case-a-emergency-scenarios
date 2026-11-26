import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, beforeEach, test } from "node:test";
import { getDatabase } from "../../src/db/client.js";
import { authSessionRepository } from "../../src/repositories/auth-session-repository.js";
import { userRepository } from "../../src/repositories/user-repository.js";
import { closeOwnerDatabase, getOwnerDatabase } from "./helpers.js";

type CreatedUser = {
  id: number;
  username: string;
};

let user: CreatedUser;

// The application only reads users, so the fixture is written and removed as the owner.
beforeEach(async () => {
  const sql = getOwnerDatabase();
  const username = `repository-test-${randomUUID()}`;
  const [createdUser] = await sql<CreatedUser[]>`
    INSERT INTO users (username, password_hash, role)
    VALUES (${username}, ${"not-a-real-password-hash"}, ${"STEWARD"})
    RETURNING id, username
  `;
  user = createdUser;
});

afterEach(async () => {
  const sql = getOwnerDatabase();
  await sql`DELETE FROM users WHERE id = ${user.id}`;
});

after(async () => {
  await closeOwnerDatabase();
  await getDatabase().end();
});

test("finds users by username without regard to casing", async () => {
  const byUsername = await userRepository.getUserByUsername(
    user.username.toUpperCase(),
  );
  const byId = await userRepository.getUserById(user.id);

  assert.equal(byUsername?.id, user.id);
  assert.equal(byId?.username, user.username);
  assert.equal(
    await userRepository.getUserByUsername(`missing-${randomUUID()}`),
    null,
  );
  assert.equal(await userRepository.getUserById(-1), null);
});

test("replaces the active session when the same user signs in again", async () => {
  const firstJti = randomUUID();
  const secondJti = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await authSessionRepository.startSession(user.id, firstJti, expiresAt);
  await authSessionRepository.startSession(user.id, secondJti, expiresAt);

  assert.equal(
    await authSessionRepository.findActiveSession(user.id, firstJti),
    null,
  );
  assert.equal(
    (await authSessionRepository.findActiveSession(user.id, secondJti))?.jti,
    secondJti,
  );
});

test("extends a due session only when its JTI still matches", async () => {
  const currentJti = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const renewedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await authSessionRepository.startSession(user.id, currentJti, expiresAt);

  const replacement = await authSessionRepository.extendDueSession(
    user.id,
    currentJti,
    renewedExpiresAt,
  );
  const staleReplacement = await authSessionRepository.extendDueSession(
    user.id,
    randomUUID(),
    renewedExpiresAt,
  );

  assert.equal(replacement?.jti, currentJti);
  assert.equal(replacement?.expiresAt.getTime(), renewedExpiresAt.getTime());
  assert.equal(staleReplacement, null);
});

test("renewing a session preserves its creation time", async () => {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const renewedExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const createdAt = new Date("2026-01-01T12:00:00.000Z");
  const sql = getDatabase();

  await authSessionRepository.startSession(user.id, jti, expiresAt);
  await sql`
    UPDATE auth_sessions
    SET created_at = ${createdAt}
    WHERE user_id = ${user.id}
  `;
  await authSessionRepository.extendDueSession(user.id, jti, renewedExpiresAt);

  const [session] = await sql<{ createdAt: Date }[]>`
    SELECT created_at AS "createdAt"
    FROM auth_sessions
    WHERE user_id = ${user.id}
  `;

  assert.equal(session.createdAt.getTime(), createdAt.getTime());
});

test("does not return a revoked session as active", async () => {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await authSessionRepository.startSession(user.id, jti, expiresAt);
  await authSessionRepository.revokeSession(user.id, jti);

  assert.equal(
    await authSessionRepository.findActiveSession(user.id, jti),
    null,
  );
});

test("revokes a user's active session", async () => {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await authSessionRepository.startSession(user.id, jti, expiresAt);
  await authSessionRepository.revokeAllSessionsForUser(user.id);

  assert.equal(
    await authSessionRepository.findActiveSession(user.id, jti),
    null,
  );
});

// Push tokens (ADR 0014, MET-A-018)

async function createOtherUser(role: string, lineGroup: string) {
  const [other] = await getOwnerDatabase()<CreatedUser[]>`
    INSERT INTO users (username, password_hash, role, line_group)
    VALUES (${`repository-test-${randomUUID()}`}, ${"not-a-real-password-hash"}, ${role}, ${lineGroup})
    RETURNING id, username
  `;
  return other;
}

async function deleteUser(id: number) {
  await getOwnerDatabase()`DELETE FROM users WHERE id = ${id}`;
}

test("finds the push token of a logged-in steward in their line group only", async () => {
  const jti = randomUUID();
  const pushToken = `token-${randomUUID()}`;
  await authSessionRepository.startSession(
    user.id,
    jti,
    new Date(Date.now() + 60 * 60 * 1000),
  );

  assert.equal(
    await authSessionRepository.savePushToken(user.id, jti, pushToken),
    true,
  );

  assert.ok(
    (await authSessionRepository.findStewardPushTokens("M1_M2")).includes(
      pushToken,
    ),
  );
  assert.ok(
    !(await authSessionRepository.findStewardPushTokens("M3_M4")).includes(
      pushToken,
    ),
  );
});

test("does not find the push token after logout or a new login", async () => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const jti = randomUUID();
  const pushToken = `token-${randomUUID()}`;

  await authSessionRepository.startSession(user.id, jti, expiresAt);
  await authSessionRepository.savePushToken(user.id, jti, pushToken);
  await authSessionRepository.revokeSession(user.id, jti);
  assert.ok(
    !(await authSessionRepository.findStewardPushTokens("M1_M2")).includes(
      pushToken,
    ),
  );

  await authSessionRepository.startSession(user.id, randomUUID(), expiresAt);
  assert.ok(
    !(await authSessionRepository.findStewardPushTokens("M1_M2")).includes(
      pushToken,
    ),
  );
});

test("does not save a push token on a session that is no longer active", async () => {
  const jti = randomUUID();
  await authSessionRepository.startSession(
    user.id,
    jti,
    new Date(Date.now() + 60 * 60 * 1000),
  );
  await authSessionRepository.revokeSession(user.id, jti);

  assert.equal(
    await authSessionRepository.savePushToken(user.id, jti, "token"),
    false,
  );
});

test("an ended session does not take the push token from the steward logged in on the phone", async () => {
  const other = await createOtherUser("STEWARD", "M1_M2");
  try {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const pushToken = `token-${randomUUID()}`;
    const endedJti = randomUUID();
    const otherJti = randomUUID();
    await authSessionRepository.startSession(user.id, endedJti, expiresAt);
    await authSessionRepository.revokeSession(user.id, endedJti);
    await authSessionRepository.startSession(other.id, otherJti, expiresAt);
    await authSessionRepository.savePushToken(other.id, otherJti, pushToken);

    assert.equal(
      await authSessionRepository.savePushToken(user.id, endedJti, pushToken),
      false,
    );
    assert.ok(
      (await authSessionRepository.findStewardPushTokens("M1_M2")).includes(
        pushToken,
      ),
    );
  } finally {
    await deleteUser(other.id);
  }
});

test("does not find the push tokens of disabled or deleted stewards", async () => {
  const disabled = await createOtherUser("STEWARD", "M1_M2");
  const deleted = await createOtherUser("STEWARD", "M1_M2");
  try {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const tokens = [`token-${randomUUID()}`, `token-${randomUUID()}`];
    for (const [index, steward] of [disabled, deleted].entries()) {
      const jti = randomUUID();
      await authSessionRepository.startSession(steward.id, jti, expiresAt);
      await authSessionRepository.savePushToken(steward.id, jti, tokens[index]);
    }
    await getOwnerDatabase()`UPDATE users SET is_disabled = TRUE WHERE id = ${disabled.id}`;
    await getOwnerDatabase()`UPDATE users SET deleted_at = NOW() WHERE id = ${deleted.id}`;

    const found = await authSessionRepository.findStewardPushTokens("M1_M2");
    assert.ok(!found.includes(tokens[0]));
    assert.ok(!found.includes(tokens[1]));
  } finally {
    await deleteUser(disabled.id);
    await deleteUser(deleted.id);
  }
});

test("does not find operators' push tokens", async () => {
  const operator = await createOtherUser("OPERATOR", "M1_M2");
  try {
    const jti = randomUUID();
    const pushToken = `token-${randomUUID()}`;
    await authSessionRepository.startSession(
      operator.id,
      jti,
      new Date(Date.now() + 60 * 60 * 1000),
    );
    await authSessionRepository.savePushToken(operator.id, jti, pushToken);

    assert.ok(
      !(await authSessionRepository.findStewardPushTokens("M1_M2")).includes(
        pushToken,
      ),
    );
  } finally {
    await deleteUser(operator.id);
  }
});

test("moves a phone's push token to the steward who logs in on it", async () => {
  const other = await createOtherUser("STEWARD", "M1_M2");
  try {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const pushToken = `token-${randomUUID()}`;
    const jti = randomUUID();
    const otherJti = randomUUID();
    await authSessionRepository.startSession(user.id, jti, expiresAt);
    await authSessionRepository.startSession(other.id, otherJti, expiresAt);

    await authSessionRepository.savePushToken(user.id, jti, pushToken);
    await authSessionRepository.savePushToken(other.id, otherJti, pushToken);

    const tokens = await authSessionRepository.findStewardPushTokens("M1_M2");
    assert.equal(tokens.filter((token) => token === pushToken).length, 1);
  } finally {
    await deleteUser(other.id);
  }
});

test("clears push tokens FCM no longer accepts", async () => {
  const jti = randomUUID();
  const pushToken = `token-${randomUUID()}`;
  await authSessionRepository.startSession(
    user.id,
    jti,
    new Date(Date.now() + 60 * 60 * 1000),
  );
  await authSessionRepository.savePushToken(user.id, jti, pushToken);

  await authSessionRepository.clearPushTokens([pushToken]);

  assert.ok(
    !(await authSessionRepository.findStewardPushTokens("M1_M2")).includes(
      pushToken,
    ),
  );
});
