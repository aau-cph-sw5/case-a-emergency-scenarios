# Scenario State Contract Changelog

## [?] - 2026-10-06

Breaking. Announced at the integration meeting on [?].

- The pattern field `track`, a string, is renamed to `trackNumber`, an integer: the physical track, 1 or 2, with the same numbering as `TrackSegment.trackNumber`. A client that reads `track` gets nothing. Issue #121.
- `covers` holds `TrackSegment` objects with `trackNumber`, `stationA` and `stationB`, where it held station codes. Pull request 101.
- Descriptions added to both `trackNumber` fields.

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
