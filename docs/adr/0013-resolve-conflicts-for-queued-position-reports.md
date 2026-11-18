# ADR 0013. Resolve Conflicts for Queued Position Reports on the Server

**Status.** Proposed
**Date.** 2026-11-16
**Deciders.** Group 7
**Related backlog items.** MET-A-006

## Context

A steward can report a position offline. The report is queued
on the phone and sent when the server can be reached. MET-A-006 requires each
queued report to be applied once and only once, because a duplicate corrupts
the picture the control room trusts.

Sending the queue can conflict with the server in three ways: the same report
arrives twice, the scenario changed while the phone was offline, or the
steward's status changed somewhere else.

## Decision

The server decides every conflict. The phone sends each report as it was made
and acts on the answer.

**Queue.** Each report gets a UUID on the phone and records the steward, the
station, the activation it was made against and the phone's time. The queue is
stored in AsyncStorage, so it survives a restart. Reports are sent in order,
one at a time, under the token of the steward who made them, as soon as the
phone is online. Sending stops at the first report the server has not decided
on, so a later report never overtakes an earlier one.

**Answers.**

| Answer | On the phone |
| --- | --- |
| `202` accepted or repeat | Removed from the queue |
| `409 E1003` activation stood down or replaced | Kept as rejected, steward told |
| `409 E1006` status changed elsewhere | Kept as rejected, status fetched again |
| Other `4xx` | Kept as rejected |
| `401`, `403`, `408`, `429`, `5xx`, no answer | Left pending, sent again later |

A rejected report is never sent again. After any report is accepted or
rejected, the phone fetches the active scenario again.

**Exactly once.** The server stores the UUID in the unique column
`position_reports.client_report_id`, with a hash of the report's content. The
same UUID with the same hash is a repeat: `202`, nothing stored and no one told.
The same UUID with other content is `409 E0007`. The report and its incident
log event are written in one transaction.

**Changed scenario.** A report against an activation that is no longer active
is rejected with `E1003`. It is never moved to a newer activation.

**Changed status.** The server orders reports by its own clock. A report must
follow from the steward's latest accepted report (MET-A-015), otherwise it is
rejected with `E1006` and the server's status wins. While a report waits on the
phone, the steward cannot arrive, cancel or check out.

## Consequences

A report is applied once however often it is sent, tested by replaying the
same queue twice and by resending the same report to the server.

A report against a stood-down scenario never reaches the server's incident
log. It stays on the phone, marked rejected.

A phone with a wrong clock cannot reorder reports, but a steward using two
phones may see reports rejected with `E1006`.

## Alternatives Considered

**Latest report wins by the phone's time.** Rejected: phone clocks cannot be
trusted, and a late report would overwrite a newer status.

**Move a report to the activation active when it arrives.** Rejected: the
report was meant for a scenario that no longer applies.

**Detect duplicates by station and time.** Rejected: two real reports can look
alike. A UUID identifies a report exactly.
