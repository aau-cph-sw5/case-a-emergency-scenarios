# Case A. Emergency Scenarios

_Nød-scenarier_ · 5th Semester, BSc Software Engineering, AAU Copenhagen · Autumn 2026

A shared situational-awareness tool that lets the control room select the active emergency or alternative-operation scenario and gives both the control room and the stewards a live graphical overview, replacing a document that is hard to navigate under pressure and reducing radio traffic.

> **New here?** Read the [documentation hub](https://github.com/aau-cph-sw5/semester-docs) first,
> in particular [CONTRIBUTING](https://github.com/aau-cph-sw5/semester-docs/blob/main/CONTRIBUTING.md),
> [onboarding](https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/01-onboarding.md) and
> [handling Metro material](https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/10-data-handling.md).

## The work

28 backlog items across 10 epics, one GitHub issue each. [Board](https://github.com/orgs/aau-cph-sw5/projects) · [Full backlog](https://github.com/aau-cph-sw5/semester-docs/blob/main/backlog/case-a-emergency-scenarios.md)

This case now carries the semester's machine-intelligence work: `MET-A-019`, scenario suggestion from a free-text incident description, and `MET-A-020`, its measured evaluation against expert-labelled examples, were raised to Must in August. Neither is in the starting set below, but the team that builds them should know from week one that they are coming in sprints 4 and 5.

**Start with the minimum demonstrable product**, the 12 items proposed for sprints 1 to 3:

- `MET-A-001` Derive the scenario domain model from the Metro alternative-operation presentations
- `MET-A-002` Scenario reference data schema, persistence and seed loader
- `MET-A-003` Scenario state contract published and versioned
- `MET-A-004` Real-time propagation of scenario and position changes to connected clients
- `MET-A-005` Active scenario and own assignment readable with no network
- `MET-A-007` Operator selects and activates a scenario from the predefined list
- `MET-A-008` Required staffing for the active scenario shown to the operator
- `MET-A-010` Steward graphical scenario overview on the mobile client
- `MET-A-011` Control-room live coverage overview with steward positions
- `MET-A-013` Steward sets current location with a single action
- `MET-A-023` Append-only incident event log with actor and timestamp
- `MET-A-025` Authentication and role-based interface routing

**2 items are blocked** on an answer from Metro Service, down from five before Metro's August answers. They are not dead: read them, and bring the question to the next sprint review. Filter the issues by `status:blocked` to see them, and by `needs:metro` for everything that still carries a question for Metro.

## Getting it running

> Replace this section in sprint 1. A new developer must be able to clone this repository
> and get the system running by following this README alone. Test that by handing it to
> somebody on another team and watching where they get stuck.

Requires Node.js 20.19 or later and a running Docker Desktop.

```bash
npm run setup
npm run dev:web
```

`npm run setup` installs dependencies, creates `.env` and a local JWT secret,
starts the local PostgreSQL database, applies the migrations and seeds scenario
data when the seed files are present (see [the seed loader guide](scripts/README.md)).
It is safe to re-run at any time, for example after pulling new migrations. If
the local database gets into a bad state, `npm run db:reset` deletes it and
rebuilds it from scratch.

The browser-based web client opens at `http://localhost:5173`; the API and
Socket.IO server run at `http://localhost:3000`. Use
`http://localhost:3000/healthcheck` to confirm the API is running. Start the
separate native Expo mobile app in a second terminal with `npm run mobile`.
`npm run stub` continues to run the fixture-backed mock API on port 4010.

`npm run build` compiles the API to `dist/` and builds the browser app to
`web/dist/`. `npm start` runs the compiled server, which serves the API,
Socket.IO, and browser app from one port.

## Hosted staging and production

Each existing Render Node service serves its matching browser-based web client,
API, and Socket.IO endpoint from a single URL. The staging service deploys the
`staging` branch; the production service deploys `main`.

Configure each Render service with:

```text
Build Command: npm ci && npm run build
Start Command: npm start
```

Render provides `PORT`; do not set it manually. Visit the relevant Render URL
to use the browser-based web client. The deployed web client connects to
Socket.IO on that same origin, so it needs no deployment-specific URL variable.

Set `DATABASE_URL` on each service to the connection string of that
environment's own database, the one the Database migrations workflow migrates.
Routes that use the database fail without it; `POST /api/v1/position-reports`
is the first.

For Expo to connect to a hosted environment, set `API_URL` in the repository
root `.env` before starting or building the mobile app, then restart Expo:

```env
# Staging example
API_URL=https://case-a-emergency-scenarios-staging.onrender.com
```

Use the production service URL when making a production mobile build. Do not
commit `.env`.

## Local database

The project has a local PostgreSQL database and Flyway Open Source migrations
for development. See [the local database guide](src/db/README.md).

## Layout

```
contracts/      published interfaces other teams build against, versioned
fixtures/       synthetic test data. Never anything Metro supplied.
src/            production Node.js API (application, routes, database access)
  db/           database client, Flyway configuration, and migrations
web/            Vite/React browser-based web client
mobile/         Expo/React Native native mobile app (installable as an Android APK)
shared/         socket event types and cross-platform connection state
stub-server/    fixture-backed mock API for contract and frontend development
tests/          automated unit and integration tests
docs/           instructions, reference, architecture decisions, records and templates
.github/        the pull request template and the automated checks
```

## Branches

`main` is production, `staging` is the integration branch and should always
run, and `dev` is the shared working branch. One feature branch per item is
named for that item.

## Pull requests

All pull requests must follow the naming convention and use the provided PR description template. GitHub Actions automatically validates both the title and description.

### PR title

Titles must use the following format:

`<type>: <description> [<ticket>]`

**Allowed types:**

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `refactor` — Code changes that do not alter functionality
- `test` — Adding or updating tests
- `chore` — Maintenance, dependencies, configuration and CI changes

The ticket must be either `MET-A-<number>` or `NO-PBI` if there is no related backlog item.

**Examples:**

```text
feat: add emergency scenario endpoint [MET-A-025]
fix: handle invalid station data [MET-A-003]
test: add contract tests [MET-A-003]
chore: update dependencies [NO-PBI]
```

### PR description

All pull requests must use the repository's PR template and complete the following sections:

- **Description:** Explain what was changed and why.
- **Context:** Link to the related GitHub issue, or specify `NO-PBI` if there is no related issue.
- **Testing:** Explain how the changes were tested. Use `N/A` with an explanation if testing is not applicable.
- **Type of change:** Select at least one checkbox that describes the changes.

The automated description checker verifies that the required sections are completed, that Context contains an issue reference or `NO-PBI`, and that at least one change type is selected.

## AI assistants

> Record here which assistants this team used and for what, per [the semester policy](https://github.com/aau-cph-sw5/semester-docs/blob/main/docs/11-ai-use.md). Two lines is enough.

## Licence

MIT, per Section 7 of the AAU and Metro Service collaboration framework.

### Authentication

```bash
npm run setup # creates .env and a local JWT_SECRET when needed
npm run seed:users
npm run dev
```

```text
POST /api/v1/auth/login
body: username, password, expectedRole → token, role

GET  /api/v1/me  (Authorization: Bearer <token>)

POST /api/v1/auth/logout  (Authorization: Bearer <token>)
```

`expectedRole` is `STEWARD` for the mobile app and `OPERATOR` for the web
dashboard. The server checks that the database account has that role before it
creates a session. Test accounts are created by `npm run seed:users`; see its
console output for usernames and passwords.
