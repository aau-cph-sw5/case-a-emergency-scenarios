# ADR 0009. Use Revocable 30-Day JWT Sessions

**Status.** Proposed
**Date.** 2026-10-21
**Deciders.** Noah Terpe Woods, Group 7
**Related backlog items.** MET-A-004, MET-A-025

## Context

Operators use the web dashboard and stewards use the mobile app. Both clients
need to identify the signed-in account to the API, survive an app restart where
appropriate, and stop access when an account signs out or signs in elsewhere.

A JWT alone cannot be revoked before it expires. A browser cookie flow would
also need a separate approach for the native mobile app.

## Decision

We use signed JWT access tokens with a 30-day lifetime. A token contains only
the user ID, role, a random JTI and standard issued-at and expiry timestamps.
It is signed, not encrypted. Passwords are stored as bcrypt hashes.

The server stores one active JTI session per user. Every protected request
validates the JWT and the active database session. Logout and a later login
replace or revoke that session, invalidating the old token.

The web client stores its session in session storage. The mobile app stores it
in platform secure storage. Login is restricted to the expected client role:
operators use web and stewards use mobile.

While an unexpired session is online with seven days or less remaining, the
client renews its token. It checks when the app opens, returns to the foreground
or regains network access. Renewal issues a new JWT with the same JTI and
atomically extends the active database session. This avoids concurrent renewal
requests invalidating one another. It does not use a separate refresh token.

The mobile app allows a cached, offline-only view for seven days after expiry.
It may queue actions locally, but it cannot call the API, connect a socket or
send queued actions with an expired token. A user signs in again before queued
actions are sent if the token has expired. The web dashboard has no offline
grace period.

## Consequences

The server can revoke a token before its expiry and enforce one active session
per account. A stolen old token stops working after logout or a later login.

Each protected request makes a database session lookup. Token renewal requires
an additional endpoint and the client must update an active socket with the new
token. The mobile app can show stale cached information for up to seven days
after expiry. Changing `JWT_SECRET` invalidates every active session.

The JWT must not contain passwords or other sensitive information. Staging and
production each need a separate `JWT_SECRET`, kept outside Git.

## Alternatives considered

**Stateless JWTs.** Rejected because logout and a second login could not
invalidate an already-issued token.

**Opaque server-side session IDs.** Rejected because JWTs provide one bearer
token format for both REST and Socket.IO. The database JTI session still gives
us server-side revocation.

**An external identity provider using OAuth or OIDC.** Rejected for now because
the project owns its user accounts and has no organisational provider to
integrate.

**Asymmetric JWT signing.** Rejected for now because this API both signs and
verifies tokens. A shared server secret is simpler, revisit this if other
services need to verify tokens.

**Encrypted JWTs.** Rejected because the token contains only user ID, role,
JTI and expiry. Signing prevents tampering, encryption would add key-management
without protecting sensitive payload data.

**A separate refresh token.** Rejected because it adds another long-lived
credential, rotation rules and storage requirements. Renewal uses the current,
unexpired access token instead.

**Permanent tokens.** Rejected because a lost device would retain access until
an unrelated secret change.

**Browser local storage.** Rejected. The web client uses browser session storage
instead: it survives a page refresh but ends with the browser session rather
than persisting indefinitely on a shared machine.

**Cookie-only sessions.** Rejected because the native mobile app would still
need a separate credential transport and storage flow.

**No offline grace period.** Rejected because a steward may lose connectivity
while still needing the last verified scenario information. The grace period is
limited to cached local data and does not extend server access.
