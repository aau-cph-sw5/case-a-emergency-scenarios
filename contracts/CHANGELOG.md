# Scenario State Contract Changelog

## 3.1.1 - 2026-10-22

Documents what `deployments[].staff` holds (no change to the shape).

- `staff` is the `userId` of the steward who reported to the station, the same id `GET /api/v1/me` and the login token return, written as text (for example `"1"`), as the server already does for position reports. The steward app matches it against the logged-in user to highlight the steward's own assignment (MET-A-010, issue #158). A client that showed `staff` as a display name should look the name up instead.

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
