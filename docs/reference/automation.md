# Automation

Five workflows run on pull requests. `pr-title-check.yml` and
`pr-description-check.yml` validate the title and the body against
`.github/PULL_REQUEST_TEMPLATE.md`; both print what they expect in their error
message. `code-quality.yml` runs lint and formatting. The two below are
documented here.

## Tests in CI

The workflow `.github/workflows/tests.yml` runs the tests automatically on every
pull request into `dev`, `staging` and `main`, and on every push to those branches.

| Check on the PR | Runs | Folder |
|---|---|---|
| Unit tests | `npm run test:unit` | `tests/unit/` |
| Integration tests | `npm run test:integration` | `tests/integration/` |

### Adding a test

Put a file named `*.test.js` or `*.test.mjs` in the right folder. It is picked up
automatically, with no change to the workflow. Tests use Node's built-in test
runner (`node:test`).

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
