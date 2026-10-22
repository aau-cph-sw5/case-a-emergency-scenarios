import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, beforeEach, test } from "node:test";
import { getDatabase } from "../../src/db/client.js";
import { authSessionRepository } from "../../src/repositories/auth-session-repository.js";
import { userRepository } from "../../src/repositories/user-repository.js";

type CreatedUser = {
  id: number;
  username: string;
};

let user: CreatedUser;

beforeEach(async () => {
  const sql = getDatabase();
  const username = `repository-test-${randomUUID()}`;
  const [createdUser] = await sql<CreatedUser[]>`
    INSERT INTO users (username, password_hash, role)
    VALUES (${username}, ${"not-a-real-password-hash"}, ${"STEWARD"})
    RETURNING id, username
  `;
  user = createdUser;
});

afterEach(async () => {
  const sql = getDatabase();
  await sql`DELETE FROM users WHERE id = ${user.id}`;
});

after(async () => {
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

test("extends an active session", async () => {
  const jti = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const extendedExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await authSessionRepository.startSession(user.id, jti, expiresAt);
  await authSessionRepository.extendSession(user.id, jti, extendedExpiresAt);

  assert.equal(
    (
      await authSessionRepository.findActiveSession(user.id, jti)
    )?.expiresAt.getTime(),
    extendedExpiresAt.getTime(),
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
