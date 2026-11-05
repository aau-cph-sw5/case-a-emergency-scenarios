# Scenario State Contract Changelog

## 6.6.0 - 2026-11-05

Additive. The steward can arrive, cancel and check out (MET-A-015, #263). Agreed with the integration team.

- A position report can carry `event`: `EN_ROUTE`, `ARRIVED`, `CANCELLED` or `CHECKED_OUT`. Left out, it is `EN_ROUTE`, so a report without it means on the way, as before.
- `ARRIVED` and `CANCELLED` are only allowed after `EN_ROUTE`, and `CHECKED_OUT` only after `ARRIVED` or `taskDone`, all at the station of the steward's latest report in the activation. Anything else gets 409 `E1006`. Sending the same event again is a harmless repeat.
- `CANCELLED` frees the station: its deployment goes back to `UNMANNED` with `staff` null.
- `EN_ROUTE` at the station of the steward's latest report, while on the way or arrived there, is a harmless repeat and does not change the status. A report without `event`, for example a tap in the station list or a report sent late from an offline queue, therefore never moves an arrived steward back to on the way.
- `EN_ROUTE` to another station ends the old one: if the steward was on the way there, it is freed as with `CANCELLED`; if they had arrived or finished the task there, it becomes `CHECKED_OUT`.
- `event` and `taskDone` cannot be sent together (400 `E0006`).
- `deployments[].status` can be `CHECKED_OUT`. Clients must handle the new value. The server does not act on `event` yet.
- `info.version` in `openapi.yaml` is now 6.6.0.

## 6.5.0 - 2026-11-04

Additive. Stewards are told when a scenario is stood down (MET-A-009, #278).

- New `scenario-stood-down` socket event to stewards, sent after `POST /api/v1/activations/{activationId}/stand-down`. It has no payload; the steward app refetches `GET /api/v1/scenario-state`, which is `null` afterwards.
- `info.version` in `openapi.yaml` is now 6.5.0.

## 6.4.0 - 2026-11-03

Additive. Task done for stewards (MET-A-015).

- A position report can carry `taskDone: true`: the steward has finished the task at the station. Without it, a report means on the way or arrived, as before.
- Task done is only allowed at the station of the steward's latest position report in the activation. Anything else gets 409 `E1006`. Sending it again is a harmless repeat.
- `deployments[].status` can be `TASK_DONE`. Clients must handle the new value. The server does not set it on deployments yet.
- `info.version` in `openapi.yaml` is now 6.4.0.

## 6.3.0 - 2026-11-03

- Scenario list and detail responses include `lineGroup`, either `M1_M2` or `M3_M4`. Scenario seed files use the same field.
- `info.version` in `openapi.yaml` is now 6.3.0.

## 6.2.0 - 2026-11-02

Additive. Standing down and switching scenarios (MET-A-009).

- New `POST /api/v1/activations/{activationId}/stand-down`, for the OPERATOR role. It sets the activation to `CLOSED` with `endedAt`, writes a `SCENARIO_STOOD_DOWN` event with the actor and time, and answers 200 with the closed activation. Afterwards no scenario is active. An activation that is already `CLOSED` answers 409 `E1003`, an unknown id 404 `E0004`.
- `POST /api/v1/scenarios/{scenarioId}/activate` takes an optional body, `activate-request.schema.json`, with `replaces`: the `activationId` of the active activation. The server then stands it down and activates the new scenario together, so a failed switch never leaves no scenario active. If `replaces` is not the active activation, nothing changes and it answers 409 `E0007`.
- Without `replaces`, activating while a scenario is active is still refused with 409 `E0007`, as in 5.1.0, so nothing is replaced by accident. The 5.1.0 rule that an activation never stands down the active one now holds only for requests without `replaces`.
- `info.version` in `openapi.yaml` is now 6.2.0

## 6.1.1 - 2026-10-30

Documents what `deployments[].staff` holds (no change to the shape).

- `staff` is the `userId` of the steward who reported to the station, the same id `GET /api/v1/me` and the login token return, written as text (for example `"7"`), as the server already does for position reports. The steward app matches it against the logged-in user to highlight the steward's own assignment (MET-A-010, issue #158).
- `info.version` in `openapi.yaml` is now 6.1.1

## 6.1.0 - 2026-10-28

Additive. Activations carry the incident log `sequence` of their `SCENARIO_ACTIVATED` event (MET-A-004).

- `scenario-state.schema.json` has a required integer `sequence`. `POST /api/v1/scenarios/{scenarioId}/activate`, `GET /api/v1/scenario-state` and `GET /api/v1/activations` return it. A higher sequence is a newer activation. Clients only gain a field, so this is not breaking.
- The `scenario-activated` socket event carries the same `sequence`.
- `info.version` in `openapi.yaml` is now 6.1.0

## 6.0.0 - 2026-10-27

Breaking.

- Login requests now require `client` (`web` or `mobile`) instead of `expectedRole`.
  The server checks the account's role against the roles allowed for that client.
- `info.version` in `openapi.yaml` is now 6.0.0.

## 5.1.0 - 2026-10-28

Only one scenario can be active at a time. Behaviour change to `POST /api/v1/scenarios/{scenarioId}/activate`: it now answers 409 (`E0007`) while any scenario is active, not only when the same scenario is active. `GET /api/v1/activations` therefore holds at most one `ACTIVE` entry. The server and stub start with no active scenario. Standing a scenario down is a separate action (MET-A-009).

`GET /api/v1/scenario-state` now returns the active activation from the same store as `GET /api/v1/activations`, and answers 200 with `null` while no scenario is active, instead of always returning the fixture.

Includes:

- `info.version` in `openapi.yaml` is now 5.1.0

## 5.0.0 - 2026-10-24

Breaking.

- `POST /api/v1/auth/login` and `POST /api/v1/auth/renew` now return a required
  `expiresAt` timestamp. Clients that validate these responses must accept and
  persist this field.
- `info.version` in `openapi.yaml` is now 5.0.0.

## 4.0.0 - 2026-10-21

Breaking.

- `GET /api/v1/me` now returns `userId` as an integer database identifier, where it previously returned a string username. Clients must update any parsing, storage, or comparisons of this field.
- `POST /api/v1/auth/login` now requires `expectedRole` (`STEWARD` or `OPERATOR`). Clients must send the role for the interface they are opening.

Also includes the additive activation and position-report changes that were prepared as 3.3.0 and 3.2.0:

Adds the activations list (additive, no breaking change).

Includes:

- `GET /api/v1/activations`, which requires a bearer token and returns an array of `scenario-state` objects. The optional `status` query parameter is `ACTIVE` or `CLOSED`; any other value, or a repeated `status`, answers 400 with error code `E0005`
- `info.version` in `openapi.yaml` is now 4.0.0

## 3.2.0 - 2026-10-20

`POST /api/v1/position-reports` documents its 403 (`E0002`, not a steward) and 409 (`E1001` no active scenario, `E1004` station not in an active scenario) responses. The server takes `staff` from the token and sets `reportedAt` to the time it accepted the report, ignoring the client's clock. Accepted reports go to connected operators only, and the Socket.IO connection needs the bearer token in `auth.token`.

## 3.1.0 - 2026-10-15

Adds the scenario activation call (additive, no breaking change).

Includes:

- `POST /api/v1/scenarios/{scenarioId}/activate`, which requires a bearer token with the `OPERATOR` role and takes the actor from the token

## 3.0.0 - 2026-10-15

- `GET /api/v1/scenarios`, `GET /api/v1/scenarios/{scenarioId}`, `GET /api/v1/scenario-state`, `GET /api/v1/metro-lines/{lineId}` and `POST /api/v1/position-reports` now require a bearer token from `POST /api/v1/auth/login`. Without a valid token they answer 401 with error code `E0001`. A client that calls them without a token gets 401 instead of data.
- `POST /api/v1/position-reports` documents its 400 response for an invalid body (error code `E0006`).
- `GET /api/v1/metro-lines/{lineId}` documents its 404 response for an unknown line.
- `info.version` in `openapi.yaml` now matches this changelog; it still said 1.0.0.

## 2.0.0 - 2026-10-06

Breaking. Announced at the integration meeting on.

- The pattern field `track`, a string, is renamed to `trackNumber`, an integer: the physical track, 1 or 2, with the same numbering as `TrackSegment.trackNumber`. A client that reads `track` gets nothing. Issue #121.
- `covers` holds `TrackSegment` objects with `trackNumber`, `stationA` and `stationB`, where it held station codes. Pull request 101.
- Descriptions added to both `trackNumber` fields.

## 1.1.0 - 2026-10-05

Adds the authentication contract (additive, no breaking change).

Includes:

- `login-request.schema.json`
- `login-response.schema.json`
- `me.schema.json`

## 1.0.0 - 2026-09-23

Initial scenario-state contract.

Includes:

- Scenario identity
- Scenario version
- Activation state
- Required stations
- Station staffing state
- Steward assignments
- Position report
