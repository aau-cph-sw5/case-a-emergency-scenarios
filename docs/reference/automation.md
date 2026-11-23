# Automation

Several workflows run on pull requests. `pr-title-check.yml` and
`pr-description-check.yml` validate the title and the body against
`.github/PULL_REQUEST_TEMPLATE.md`; both print what they expect in their error
message. `code-quality.yml` runs lint and formatting. Tests, coverage and
labels are documented below.

## Tests in CI

The workflow `.github/workflows/tests.yml` runs on every pull request, on every
push to `dev`, `staging` and `main`, and on demand under
**Actions → Tests → Run workflow**. Each job is its own check on the pull request:

| Check on the PR | Runs | Fails when |
|---|---|---|
| Unit tests | `npm run test:unit` | a test in `tests/unit/` fails |
| Integration tests | `npm run test:integration`, against a test database | a test in `tests/integration/` fails |
| Jest tests | `npm run test:jest` | a test in `tests/jest/` fails |
| Backend coverage | combines Node and Jest coverage | a test job fails, changed-file or overall line coverage is below 80%, or backend branch coverage is below 75% |

Unit and integration tests collect coverage with c8; Jest collects its own
coverage. Backend coverage waits for all three and checks the threshold only
after they pass, and fails if any test job fails. The job keeps its existing
name for required status checks; Jest should also be required directly for a
clear, independent status.

### Test database

The Integration tests job starts a throwaway PostgreSQL 16 container, applies
every migration in `src/db/migrations/` with Flyway, and sets
`TEST_DATABASE_URL` for the tests. The database holds only what the migrations and tests create,
exists only while the job runs, and never touches the staging or production
databases, so its users and passwords (`metro`/`metro` and `metro_app`/`metro_app`)
are not secrets.

The job creates the `metro_app` role with `docker/db-init/01-app-role.sql`
before Flyway runs, migrates as `metro`, and gives the tests two URLs:
`TEST_DATABASE_URL` for `metro_app`, as the application connects, and
`TEST_OWNER_DATABASE_URL` for `metro`, used for fixtures the application may not
write and for proving what `metro_app` is refused.

Because of this, every new migration is applied on every pull request, before it
reaches `staging`.

When the tests need something new from the database, such as another role or
seed data, change this job only.

### Adding a test

Put a file named `*.test.js`, `*.test.mjs` or `*.test.ts` in `tests/unit/` or `tests/integration/` (see the README in each folder). It is picked up automatically, with no change to the workflow. Tests use Node's built-in test runner (`node:test`).

A folder with no tests reports 0 tests and passes. A green check therefore means
"nothing failed", not "this is tested".

### Not set up yet

End-to-end tests (`tests/e2e/`) wait until the control-room and steward apps exist.
## Automatic pull request labels

The `Pull request labels` workflow labels pull requests targeting `dev`,
`staging`, or `main`. It runs when a pull request is opened, reopened, or
updated with new commits.

The workflow only applies existing repository labels. Create the labels under
**GitHub repository → Issues → Labels** before relying on the workflow.

### Required labels

| Label | Suggested color | Applied when |
| --- | --- | --- |
| `pr size: xs` | `#C5DEF5` | 0–50 lines changed |
| `pr size: s` | `#0E8A16` | 51–200 lines changed |
| `pr size: m` | `#FBCA04` | 201–650 lines changed |
| `pr size: l` | `#E99695` | 651–1000 lines changed |
| `pr size: xl` | `#B60205` | More than 1000 lines changed |
| `frontend` | `#1D76DB` | Frontend files change |
| `backend` | `#5319E7` | Backend files change |
| `database` | `#0052CC` | Database, migration, Prisma, or SQL files change |
| `documentation` | `#0075CA` | Documentation or Markdown files change |
| `tests` | `#BFDADC` | Test files change |
| `ci` | `#6F42C1` | Files under `.github/` change |

PR size is calculated as additions plus deletions. Exactly one size label is
kept on each pull request. A pull request can have multiple area labels.

Area paths are configured in `.github/labeler.yml`. The current frontend,
backend, database, and test paths are provisional because the application
structure has not been created yet. Update `.github/labeler.yml` to match the
actual file structure as soon as those parts of the application are set up.

The workflow uses `pull_request_target` without checking out or executing pull
request code. Do not add checkout, install, build, or test steps to this
workflow. Code-quality checks belong in their own `pull_request` workflows.

The workflow starts working after it has been merged into the target branch.
It cannot label the pull request that introduces it because
`pull_request_target` workflows use the workflow definition from the target
branch.

## Test coverage

The Backend coverage job in `tests.yml` reports line coverage for backend,
shared, web and mobile application code. It combines Node unit and integration
coverage from c8 with Jest coverage. For frontend files, Jest defines executable
lines and Node test hits on the same lines count too; a line is counted once.

On pull requests and merge queues, the combined coverage of changed application
files must be at least 80%. It uses full files, including unchanged lines. Each
file gets an informational ✅ or ❌; only the combined percentage is enforced
per group. Overall application line coverage must also reach 80%. Generated shared types,
declarations, startup entry points (`mobile/index.ts` and `web/src/main.tsx`),
scripts, configuration, assets and database migrations are excluded.

Backend branch coverage is checked separately using the c8 results for `src/`;
the weighted total must reach 75% on pull requests and merge queues.

The report appears in the workflow summary and in a pull request comment updated
on each push. A separate test-results comment shows unit, integration and Jest
counts and is updated on each push. SonarQube receives the same application line
coverage in LCOV format. For PRs Sonar analyzes the source branch; files whose
source differs from the tested merge are omitted from its coverage report rather
than attaching hits to the wrong lines. Updating the branch with its base makes
these files match. SonarQube can apply its own quality-gate rules.
Require the GitHub Actions `Sonar quality gate` check in the branch ruleset;
it enforces the quality gate on pull requests and passes for merge queues.

`npm run test:coverage` produces a local c8 HTML report, but does not combine
Jest's coverage into the CI report.

SonarQube's GitHub integration publishes issue annotations when the project is
bound to the repository and issue annotations are enabled in its settings.
The scan job summary links directly to the SonarQube analysis.

A failing Backend coverage check blocks a merge only when it is a required
status check in the repository ruleset. For details see ADR 0007.

## Migration versions

The **Migration versions** workflow runs on pull requests, merge-queue checks,
and pushes to `dev`, `staging`, and `main`. It rejects duplicate numeric Flyway
versions and gaps in the sequence. The project convention is a three-digit
prefix. The sequence starts at `V001`, so if the latest migration is `V004`,
write the next one as `V005`. Leading zeroes are normalized, so `V005`, `V5`,
and `V0000005` are version 5.
