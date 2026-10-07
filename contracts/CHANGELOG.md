# Scenario State Contract Changelog

## 2.0.0 - 2026-10-06

Breaking. Announced at the integration meeting on [?].

- The pattern field `track`, a string, is renamed to `trackNumber`, an integer: the physical track, 1 or 2, with the same numbering as `TrackSegment.trackNumber`. A client that reads `track` gets nothing. Issue #121.
- `covers` holds `TrackSegment` objects with `trackNumber`, `stationA` and `stationB`, where it held station codes. Pull request 101.
- Descriptions added to both `trackNumber` fields.
- A route item in an operating pattern requires `sequence`, an integer, and `station`, a string. It was an unconstrained object. Pull request 105.

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
