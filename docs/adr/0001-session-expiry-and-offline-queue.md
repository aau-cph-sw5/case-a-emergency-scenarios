# ADR 0001: Session expiry and offline queue preservation

**Status:** Accepted for Sprint 2. The lifetime is a placeholder until Metro answers.
**Issue:** #89, sub-task 2 of MET-A-025 (#24)
**Builds on:** #88 / PR #95, sub-task 1: sign-in with JWT
**Related:** MET-A-006, reconnection and exactly-once delivery of queued reports

## Context

Stewards can file reports with no connection. The client holds these reports in a queue until it can send them. A steward's session can expire before that happens. Reports in the queue are facts about where a steward was, so losing one because a token ran out is not acceptable.

Sub-task 1 issues a signed JWT on `POST /api/v1/auth/login` that carries `userId` and `role`. This record defines how long that token lives, what happens when it expires, and what the client must do with its queue when that happens.

## Decision

### Session lifetime

- A session is the JWT issued by `POST /api/v1/auth/login`.
- It lives **1 hour** from sign-in. The lifetime is absolute: activity does not extend it.
- The value is `TOKEN_TTL` in `stub-server/auth.js`, set in sub-task 1. It stays at 1 hour until Metro answers the open question below.

### Refresh

- **There is no refresh.** There is no refresh token, no refresh endpoint and no sliding expiry.
- When a session has expired, the user must sign in again to get a new one.

### Expiry

The client can detect expiry in two ways:

1. **Locally, with or without a connection.** The client reads the `exp` claim from the token payload and compares it with the current time. This lets an offline client know that its session has expired without asking the server. The client does not verify the signature; only the server does that.
2. **From the server.** The server answers `401` with `"Invalid or expired token"` for both an expired and an invalid token. When the client gets a `401`, it reads the token's `exp`: if it has passed, the session expired. Otherwise the token is invalid.

Only an expired session gets the expiry message. For any other `401`, the client sends the user to sign in without it.

### Queue rules

These rules apply to every client that queues reports offline. A reference implementation lives in `shared/session/offline-queue.js`.

1. **Each entry is stamped with the user who made it.** When a report is queued, the entry records the `userId` of the signed-in user.
2. **An entry is removed only when the server accepts it.** A `2xx` response is the only thing that removes an entry from the queue. Expiry, sign-out, a lost connection or any other error never removes one.
3. **Expiry pauses sending.** If the session has expired, either found before sending or from a `401` with an expired token, the client stops sending and leaves every remaining entry in the queue.
4. **Entries are sent only under the user who made them.** After a new sign-in, the client sends the entries whose `userId` matches the signed-in user, using that user's token. Entries from any other user stay in the queue untouched until that user signs in.
5. **Order is kept.** Entries are sent in the order they were queued. Sending stops at the first entry that is not accepted, so a later report never overtakes an earlier one.

### Telling the user

When the session has expired, the client shows this message:

> Your session has expired. Sign in again. Your queued reports are kept and will be sent when you sign in.

The text is exported as `SESSION_EXPIRED_MESSAGE` from `shared/session/session.js`, so every client says the same thing. It must state that the reports are kept, because the main worry for a steward who has been logged out is whether the reports were lost.

## Consequences

- A steward on a shift longer than 1 hour will be asked to sign in again at least once during it. Without refresh, this is the cost of a short, fixed lifetime.
- A report queued in a tunnel is never lost to expiry. It waits until the same user signs in again.
- If a different user signs in on the same device, the earlier user's reports are neither sent under the new user nor deleted.
- The server from sub-task 1 is unchanged. Expiry is detected on the client from the token itself.

## Open questions and out of scope

- **[Detail · Metro]** How long should a steward session last during a shift, and should expiry be allowed at all during an active incident? 1 hour is a placeholder until Metro answers.
- **Steward identity.** Metro said in August 2026 that stewards start the app with no login, and that their identity comes from the device's SOTI managed configuration. This record builds on the password login from sub-task 1, because that is what exists. If the team moves to device identity, the queue rules above still apply, with `userId` taken from the device instead.
- **Not covered here; belongs to MET-A-006:**
  - Exactly-once delivery, which needs an idempotency key on reports
  - Keeping the queue across an app restart
  - Reconciliation against a changed scenario
  - What to do with a report the server rejects permanently
