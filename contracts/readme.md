## Stub API

### Install dependencies:

```bash
npm install
```

### Start the MET-A-003 scenario-state stub: 
```bash 
npm run stub
```

### The stub runs at:
http://localhost:4010

### Validate fixtures against the schemas:
```bash
npm run validate
```
Checks every fixture in `fixtures/v1` against its schema in `contracts/v1` and exits with an error if one does not match.

The stub also validates while running: a GET whose fixture does not match its schema returns 500 with the errors, and a POST with an invalid body returns 400.

### Endpoints:
GET  /api/v1/scenario-state

GET  /api/v1/scenarios

GET  /api/v1/scenarios/{scenarioId}

GET  /api/v1/metro-lines/{lineId}

POST /api/v1/position-reports

POST /api/v1/scenarios/{scenarioId}/activate
