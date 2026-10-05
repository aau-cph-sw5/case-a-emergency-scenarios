# Scenario State Contract Changelog

## 2026-10-05, no version change

- Descriptions added to the pattern field `track` and to `TrackSegment.trackNumber`. Both hold the physical track, 1 or 2; the pattern carries it as a string, the segment as an integer.
- Planned, breaking, for the next version: the pattern field `track` becomes `trackNumber`, an integer. Tracked in issue #121.

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
