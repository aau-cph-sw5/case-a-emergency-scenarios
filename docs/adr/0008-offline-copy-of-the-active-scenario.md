# ADR 0008. Keep a bounded copy of the active scenario on the steward's phone

**Status.** Proposed
**Date.** 2026-10-16
**Deciders.** Anas Elmansari
**Related backlog items.** MET-A-005 (#5), MET-A-010 (#10, #157–#159), MET-A-006 (#6)

## Context

Stewards work on platforms, in tunnels and on moving trains. The PDF they use
today works without a connection, so the app must not be worse when the signal
drops (MET-A-005).

The steward app gets the active scenario from `GET /api/v1/scenario-state` and
`GET /api/v1/scenarios/:id`. Both need a bearer token, and a token lasts one
hour. A steward who is underground for longer, or who opens the app without
signal, cannot log in.

## Decision

The app saves a copy only while a scenario is active. Every time the steward
view fetches the active scenario (when it opens, when the app returns to the
foreground and when the connection changes), the result replaces the saved
copy. When no scenario is active, the copy is removed and nothing is saved.
The steward does not have to do anything for this.

The copy is bounded. It holds one activation and, of that scenario, only its
id, name, `covers` and the current version's station requirements and
passenger information. Other versions and the operating plan are left out. The
copy is stamped with the time it was saved and the steward's `userId`.

When the server cannot be reached, the app shows the copy with a banner that
stays on screen: "Offline · sidst opdateret HH:MM". A copy older than 60
minutes also shows its age in red. The 60 minutes is a placeholder until Metro
answers how long a copy can be trusted; it lives in `STALE_AFTER_MS` in
`shared/offline/scenario-snapshot.ts`.

The switch to the copy is automatic. The app follows the phone's connection
with `@react-native-community/netinfo`. When the connection drops, the copy
is shown at once, without waiting for a request to time out, and an Android
toast says "Du er offline"; when it returns, the app fetches again and the
toast says "Du er online igen". If the app is opened without a connection, the
copy opens by itself instead of the login screen, because a steward without
signal cannot get a token. It is read-only, and the login screen returns when
the connection does.

The banner says why the copy is shown: "Offline" when the server gives no
answer, "Sessionen er udløbet" when it answers 401, and "Serverfejl" for any
other error. Copies not from today show the date as well as the time.

The `userId` is read from the token the server issued, without a request, so a
steward who loses signal right after logging in still sees their own copy. The
signature is not checked on the phone; it only decides whose copy to show, and
the server checks the token on every request.

The copy is stored with `@react-native-async-storage/async-storage`, the first
storage dependency in `mobile/`. The logic is in `shared/` with the storage
passed in, so it is tested in Node with an in-memory fake.

## Consequences

A steward can read the last active scenario and its stations without signal,
also after restarting the app. The copy includes the deployments, so their own
assignment is readable as soon as #158 links `deployments[].staff` to the user
id; today `staff` holds names.

Anyone holding the phone without a connection can read the last copy. It
contains the scenario and the names in its deployments, not credentials.

The copy is only as fresh as the last time the steward opened the view while
online. Nothing refreshes it in the background yet; a push on activation
belongs to #131.

The response checklist from MET-A-005's first criterion is not part of the copy,
because it does not exist yet (MET-A-021, #21).

## Alternatives considered

Keeping the session on the phone so the steward stays logged in. Rejected:
the token expires after one hour, so it does not cover a long time
underground, and it would keep a credential on the device.

Saving every scenario the steward has seen. Rejected: the store would grow
without limit, which MET-A-005 rules out.

Sending queued reports is a different problem, handled by the offline queue of
MET-A-025 (#89) and MET-A-006 (#6).

## Follow-ups

- Let `web/src/scenarios.ts` use the shared `getJson`, `HttpError` and `FormatError` from `shared/api/http.ts`, as `shared/auth` and `shared/scenario` already do, so the web client has the same timeout and error types.
- Cancel requests still in flight when the view closes, as `web/src/ScenarioList.tsx` does.
