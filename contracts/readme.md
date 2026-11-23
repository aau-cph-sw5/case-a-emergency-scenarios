## Stub API

### Contract version notifications

When `info.version` in `contracts/v1/openapi.yaml` changes on the default
branch, GitHub Actions sends a message to Discord with the old and new versions,
the matching version's notes from `contracts/CHANGELOG.md`, and a link to the
changes. Keep the changelog updated with a heading such as `## 7.3.0 - 2026-11-09`.
Long notes are shortened to fit Discord; if no matching notes exist, the message
says so. Add a `DISCORD_CONTRACT_WEBHOOK` GitHub Actions secret containing the
Discord webhook URL for the desired channel. This is separate from the review
notification webhook.
The workflow does not notify for changes on feature, staging, or production
branches unless one of them is the default branch.

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

GET /api/v1/scenario-state

GET /api/v1/scenarios

GET /api/v1/scenarios/{scenarioId}

GET /api/v1/metro-lines/{lineId}

POST /api/v1/position-reports

POST /api/v1/auth/login

GET /api/v1/me

POST /api/v1/scenarios/{scenarioId}/activate
