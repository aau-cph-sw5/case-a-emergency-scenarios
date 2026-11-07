# ADR 0010. Load the control-room data once in a shared provider

**Status.** Proposed
**Date.** 2026-10-27
**Deciders.** Group 10
**Related backlog items.** MET-A-007, MET-A-011

## Context

The active-scenario banner and the six sub-issues of MET-A-011 read the same
data: the active activations (`GET /api/v1/activations?status=ACTIVE`) and
scenario definitions (`GET /api/v1/scenarios/:scenarioId`).

The banner, `ScenarioList` and the steward positions (#201) each fetched for
themselves, and PR #208 added a fourth fetch. One activation therefore sent one
request per component, and a slow answer could leave two components showing
different states.

The group agreed that one person builds the data loading, so the others work
only on the UI.

## Decision

We load the control-room data once in `LiveDataProvider`, mounted in `App.tsx`,
and UI components read it through `useLiveData()` and `useScenario(id)` without
fetching or listening to the socket themselves.

The provider reloads the activations on login, on `activations-changed` and on
every reconnect, and ignores an answer that arrives after a newer one.
`useScenario()` shares one request per scenario id.

## Consequences

One activation sends one request, and every component shows the same answer. A
component needs no token or socket, and its tests provide data through
`LiveDataContext` instead of mocking the server.

Every component inside the provider renders again when any field changes. Each
`activations-changed` reloads every active activation in full. A scenario
definition is kept for the whole login, so a definition changed on the server
shows only after a new login. New data needs a change in `web/src/data/`, which
every sub-issue depends on.

Reversing the decision means passing the token to every component again.

## Alternatives considered

**Each component fetches.** Rejected because of the duplicate requests and
disagreeing answers described above.

**Load in `App.tsx` and pass props down.** Rejected because every component in
between must pass on props it does not use. #185's status bar sits three levels
below `App`.

**Push the full state with a `revision` counter** (`scenario-state-updated`,
planned in #184). Rejected for now because it needs ordering per activation and
a backend change with no owner, while `activations-changed` already exists (ADR
0008).

**A data-fetching library such as TanStack Query.** Rejected because it is a new
dependency for the whole group mid-semester, and the reload on socket events
would still be ours to wire. Two hooks cover the seven components.

## Notes

How to call the hooks: `docs/instructions/frontend-data.md`. The steward app
(MET-A-005) loads its data separately.
