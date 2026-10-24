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
| Backend coverage | merges the coverage of both test jobs | every test passed, but coverage is below 75% or dropped more than 2 percentage points compared with `dev`, see [Test coverage](#test-coverage) |

The test jobs run under c8 to collect coverage, but they don't check it.
Backend coverage waits for both and still runs when a test fails, but checks
the coverage only when every test passed, so a failing test and too-low coverage
show as separate checks.

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

The Backend coverage job in `tests.yml` measures how much of `src/` the unit
and integration tests execute, with [c8](https://github.com/bcoe/c8). The test
jobs save their raw coverage as artifacts, and Backend coverage merges them.
It runs wherever `tests.yml` runs.

| Where | What you see |
|---|---|
| Pull request | One comment with the coverage table, updated on every push |
| Workflow run → Summary | The same table, for every run |
| Locally | `npm run test:coverage`, then open `coverage/index.html` to see uncovered lines |

The **vs `dev`** column compares with the latest successful Tests run on
`dev`. Every successful push to `dev` saves its coverage as the
`coverage-baseline` artifact (kept for 90 days). Until one exists, the column
shows `–`.

### Scope

Every TypeScript file in `src/` is measured. Web and mobile are not measured yet.

### Required coverage

Both rules are set in `.c8rc.json`, and Backend coverage fails when either is
broken:

| Rule | Key in `.c8rc.json` | Today |
|---|---|---|
| Minimum coverage, per metric | `lines`, `branches`, `functions`, `statements` | 75% each |
| Maximum drop compared with `dev`, per metric | `max-decrease` | 2 percentage points |

The maximum drop is checked only on pull requests, by
`scripts/check-coverage-decrease.mjs`, against the same coverage from `dev` as
the **vs `dev`** column. While there is no coverage from `dev` yet, only the
minimum is checked. In the PR comment, ❌ marks a broken rule.

The minimum is also checked locally by `npm run test:coverage`.

To change either rule, change `.c8rc.json` in a pull request. A failing Backend
coverage check stops a pull request from being merged only when **Backend
coverage** is a required status check in the `dev` ruleset, which an admin
sets.

Why it works this way is in ADR 0007.

## Migration versions

The **Migration versions** workflow runs on pull requests, merge-queue checks,
and pushes to `dev`, `staging`, and `main`. It rejects duplicate numeric Flyway
versions and gaps in the sequence. The project convention is a three-digit
prefix. The sequence starts at `V001`, so if the latest migration is `V004`,
write the next one as `V005`. Leading zeroes are normalized, so `V005`, `V5`,
and `V0000005` are version 5.
