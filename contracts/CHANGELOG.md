# Scenario State Contract Changelog

## 1.1.0 - 2026-10-06

Adds the scenario activation call (additive, no breaking change).

Includes:

- `POST /api/v1/scenarios/{scenarioId}/activate`
- `activation-request.schema.json`
- `error.schema.json`

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
