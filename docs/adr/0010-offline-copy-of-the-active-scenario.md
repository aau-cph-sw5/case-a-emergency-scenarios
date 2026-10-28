# ADR 0010. Keep a Bounded Copy of the Active Scenario on the Steward's Phone

**Status.** Proposed
**Date.** 2026-10-27
**Deciders.** Andreas Foverskov, Group 7
**Related backlog items.** MET-A-005 (#5), MET-A-004, MET-A-010 (#157, #158)

## Context

Stewards work on platforms, in tunnels and on moving trains. The PDF they use
today works without a connection, so the app must not be worse when the signal
drops (MET-A-005).

The steward app gets the active scenario from `GET /api/v1/scenario-state` and
`GET /api/v1/scenarios/:id`. Since ADR 0009 the session is kept in secure
storage for 30 days, but `useSession` confirms it with `GET /api/v1/me` when the
app opens. Without a connection that check fails and the session is
`unavailable`, which until now showed a screen with nothing to read.

This ADR builds on an earlier proposal for MET-A-005 (PRs #177 to #179), which
predated the stored session and opened the copy in place of the login screen.

## Decision

The app keeps one copy of the active scenario on the phone. Every fetch while
a scenario is active replaces it; when no scenario is active it is removed.
The steward view fetches when it opens, when the app returns to the
foreground, when the connection changes and when the socket announces an
activation. The steward does not have to do anything.

The copy is bounded. It holds one activation and, of that scenario, only its
id, name, `covers` and the current version's station requirements and
passenger information. Other versions and the operating plan are left out.
It is stamped with the time it was saved and the steward's user id, read from
the stored token. Another steward's copy, or a damaged one, counts as no copy.

The copy is shown when the server cannot be reached:

- In the `unavailable` session state, the steward view opens with the copy
  instead of a dead end. The session is confirmed again as soon as the phone
  reports a connection, or when the steward taps "Prøv igen".
- While signed in, the copy is shown at once when the phone loses its
  connection, without waiting for a request to time out, and when a request
  fails. A token the server refuses restores the session, which signs the
  steward out.

A banner stays on screen over the copy: "Offline" or "Serverfejl", "gemt
kopi" and "Sidst opdateret HH:MM", with the date when the copy is not from
today. After 60 minutes the banner turns red and shows the age. The 60
minutes is a placeholder until Metro answers how long a copy can be trusted;
it lives in `STALE_AFTER_MS` in `shared/offline/scenario-snapshot.ts`.
A copy saved more than 2 minutes in the future means the phone's clock has
been turned back; its age is unknown, so the banner is red and says so.
Position reports and the socket controls are hidden while the copy is shown,
since they need the server.

The app follows the connection with `@react-native-community/netinfo` and
shows an Android toast, "Du er offline" and "Du er online igen". The copy is
stored with `@react-native-async-storage/async-storage`; secure storage is
meant for small secrets, not a scenario. The logic is in `shared/offline/`
with the storage passed in, so it is tested in Node and Jest with an in-memory
fake.

Logging out removes the copy, so a signed-out phone holds no scenario data.

## Consequences

A steward who has opened the app online during an activation can read the
scenario and its stations without signal, also after restarting the app.

The copy is only as fresh as the last time the app was open while online.
Nothing refreshes it in the background.

Anyone holding an unlocked phone with a stored session can read the copy. It
holds the scenario and the names in its deployments, not credentials.

Opening the app in a weak signal can still wait for the 10-second request
timeout in `useSession` before the copy appears, because NetInfo only knows
whether there is a connection, not whether the server answers.

Two parts of MET-A-005's first criterion are not covered yet. The steward's
own assignment needs `deployments[].staff` linked to the user id (#158), and
the response checklist does not exist yet (#21).

## Alternatives Considered

Opening the copy in place of the login screen when there is no session.
Rejected: since ADR 0009 the session survives restarts, so the stored session
already says whose copy to show.

Saving every scenario the steward has seen. Rejected: the store would grow
without limit, which MET-A-005 rules out.

Storing the copy in `expo-secure-store`. Rejected: it is meant for small
secrets and a scenario is neither.
