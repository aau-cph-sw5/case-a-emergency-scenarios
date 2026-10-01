# Tests in CI

The workflow `.github/workflows/tests.yml` runs the tests automatically on every
pull request into `dev`, `staging` and `main`, and on every push to those branches.

| Check on the PR | Runs | Folder |
|---|---|---|
| Unit tests | `npm run test:unit` | `tests/unit/` |
| Integration tests | `npm run test:integration` | `tests/integration/` |

## Adding a test

Put a file named `*.test.js` or `*.test.mjs` in the right folder. It is picked up
automatically, with no change to the workflow. Tests use Node's built-in test
runner (`node:test`).

A folder with no tests reports 0 tests and passes. A green check therefore means
"nothing failed", not "this is tested".

## Not set up yet

End-to-end tests (`tests/e2e/`) wait until the control-room and steward apps exist.