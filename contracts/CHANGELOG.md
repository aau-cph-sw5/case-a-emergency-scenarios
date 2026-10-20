# Scenario State Contract Changelog

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
