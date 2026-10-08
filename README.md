# Case A. Emergency Scenarios

*Nød-scenarier*  ·  5th Semester, BSc Software Engineering, AAU Copenhagen  ·  Autumn 2026

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

```bash
# requires Node.js 20 or later
npm install
cp .env.example .env
npm run dev
```

The real API then runs at `http://localhost:3000`; use
`http://localhost:3000/health` to confirm it is running. `npm run stub`
continues to run the fixture-backed mock API on port 4010.

The API is written in TypeScript. Use `npm run build` to compile it to `dist/`
and `npm start` to run the compiled server.

## Local database

The project has a local PostgreSQL database and Flyway Open Source migrations
for development. See [the local database guide](src/db/README.md).

## Layout

```
contracts/      published interfaces other teams build against, versioned
fixtures/       synthetic test data. Never anything Metro supplied.
src/            production Node.js API (application, routes, database access)
  db/           database client, Flyway configuration, and migrations
stub-server/    fixture-backed mock API for contract and frontend development
tests/          automated unit and integration tests
docs/           instructions, reference, architecture decisions, records and templates
.github/        the pull request template and the automated checks
```

## Branches

`main` protected, only what has been demonstrated at a review. `staging` integration, should always run. `development` the shared working branch. One feature branch per item, named for it.

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
npm run seed:accounts
npm run stub
```
POST /api/v1/auth/login  (body: username, password → token, role)

GET  /api/v1/me  (Authorization: Bearer <token>)

Test-konti oprettes af `npm run seed:accounts` — se konsol-output for brugernavn/password pr. rolle.
