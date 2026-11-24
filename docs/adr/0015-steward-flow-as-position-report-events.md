# ADR 0015. Report Each Step of the Steward Flow as a Position Report Event

**Status.** Accepted
**Date.** 2026-11-23
**Deciders.** Team A
**Related backlog items.** MET-A-012

## Context

At first a steward could only report that they were on the way to a station.
From that one report the server could not tell whether the steward had
arrived, was still there or had left. MET-A-012 therefore planned to derive
station states on the server and to treat a report as stale after some time.

MET-A-015 changed how a steward works during an activation. At the integration
meeting on 2026-11-16 it was agreed that this new flow meets the first two
acceptance criteria of MET-A-012, and that this ADR describes it.

## Decision

The steward reports every step of their work at a station, and the server
keeps the steward's status from those reports. Each step is a position report
with an `event`.

**The flow.**

1. **On the way.** The steward picks a station in the list and confirms with
   the BEKRÆFT slide. The app sends `EN_ROUTE`. The station shows the steward
   as on the way (`PENDING`).
2. **Arrived.** At the station the steward confirms arrival. The app sends
   `ARRIVED` and the steward is at the station (`MANNED`).
3. **Task done.** A report with `taskDone` marks the task as finished
   (`TASK_DONE`).
4. **Checked out.** When the steward leaves, the app sends `CHECKED_OUT`. The
   deployment keeps the steward, so the control room sees who was there.
   After checking out, the steward can pick a new station.

While on the way, the steward can cancel (`CANCELLED`), which frees the
station and leaves the steward with no station. The server also accepts
`EN_ROUTE` to another station while on the way, which frees the old one.

**Rules.** A step is only allowed after the step before it, at the station of
the steward's latest report in the activation:

| Event | Allowed |
| --- | --- |
| `EN_ROUTE` | With no station, while on the way, or after checking out |
| `ARRIVED` | Only while on the way |
| `CANCELLED` | Only while on the way |
| `CHECKED_OUT` | Only after arriving or task done |

Anything else is rejected by the server. The app checks the same rules
before it sends, so the steward is never offered a step the server would
refuse. Sending the same event again is a harmless repeat, so a late
`EN_ROUTE` from the offline queue never moves an arrived steward back to on
the way.

**The server's status wins.** The server stores every accepted report and
derives the deployments of the activation from them. The scenario state
returns them, so a reload, a restart or another phone shows what the server has. The
app only remembers its own last change until the next copy of the scenario
arrives.

**Offline.** Going on the way can be reported offline. The report is queued
and sent later. Arriving, cancelling and checking out need the
server, so they cannot overtake a queued report.

**What the control room sees.** The station list, totals and maps in both
apps read the deployments through one shared rule. A
required station is covered when enough stewards have arrived, partial when
some have, and a gap when none have. A steward on the way does not cover a
station yet. A station stops being covered when the steward checks out or
cancels, or the activation is stood down, not after a fixed time.

## Consequences

The control room always knows each steward's last step, so a gap is shown
without a stale timer. A new activation starts with every station free, and a
queued report for an older activation is rejected.

A steward who leaves without checking out still counts as at the station until
they check out or the activation ends.

The steward has more to do: confirm arrival and check out. Without those
steps, the control room's picture is wrong.

Changing the flow means changing the contract, the server and the steward app
together.

## Alternatives Considered

**Keep one "on the way" report and treat it as stale after a fixed time.**
Rejected: a steward can stand at a station for hours without reporting, and
Metro has not given a time limit. An explicit check out says when a station is
left.

**Let the steward set any status directly.** Rejected: out-of-order steps from
two phones or an offline queue could leave a wrong status. Allowing only the
next step keeps the server's picture consistent.
