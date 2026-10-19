# ADR 0008. Push updates to clients over Socket.IO and send client changes over HTTP

**Status.** Proposed
**Date.** 2026-10-19
**Deciders.** group 7
**Related backlog items.** MET-A-004, MET-A-007

## Context

MET-A-004 requires two kinds of change to reach other clients quickly. A
scenario activated by an operator must reach a connected steward client, and a
steward's position report must reach the control-room overview. Both must
arrive within 3 seconds at the 95th percentile on staging with 25 simulated
clients connected. A client that loses its connection must be detected within
30 seconds and shown as stale, and messages for one steward must be applied in
the order they were generated.

In both cases the client that must react does not know when the change will
happen. Plain HTTP only lets the client start a request, so without another
transport the receiving client has to poll.

## Decision

The server pushes changes to clients over Socket.IO, and clients send their own
changes to the server over the HTTP API.

An operator activates a scenario with `POST /api/v1/scenarios/{scenarioId}/activate`,
and the server then emits `scenario-activated` to the connected clients. A
steward sends `POST /api/v1/position-reports`, and the server forwards the
report to the operators over the socket.

## Consequences

What becomes easier:

- A change reaches the receiving clients as soon as the server has it, without
  polling. The latency is roughly one network trip, and no requests are sent
  while nothing changes.
- Client changes keep using the existing HTTP 
- Socket.IO reconnects automatically, which matters on a phone, because the app can be left running in the background
- Event payloads are typed in `shared/socket/events.ts`, so the server, web and
  mobile agree on what an event contains.


## Alternatives considered

**Polling over HTTP.** Every client asks for the current state at a fixed
interval. The delay depends on the interval: with 2 seconds, a change can be up
to 2 seconds old before the request even starts, so staying under 3 seconds at
the 95th percentile needs polling about every second. With 25 clients that is
at least 25 requests per second, almost all answered with no change.


**Server-sent events.** One-way push from server to client over HTTP, which is
enough for these events. React Native has no built-in `EventSource`, so the
mobile app would need a third-party library, and reconnection and per-role
delivery would have to be built by hand.

**Plain WebSocket.** The same latency as Socket.IO, but reconnection, the
heartbeat, rooms for sending to one role, and the event format would all have to
be written and tested by us.

**Sending position reports over the socket as well.** Would save the time to
open an HTTP request, a few milliseconds per report. It would mean rebuilding
authentication, validation and acknowledgements for the socket, which the HTTP
endpoint already has.


