# ADR 0007. Measure backend coverage in CI and require a minimum

**Status.** Proposed
**Date.** 2026-10-13
**Revised.** 2026-10-16: the tests run once and coverage is merged in a separate job.
**Revised.** 2026-10-19: require 75% and allow at most a 2 percentage point drop compared with `dev`, instead of only reporting.
**Deciders.** Kenneth Lykke Jensen, automation team
**Related backlog items.** NO-PBI

## Context

`tests.yml` runs unit and integration tests, but nothing measures what they
execute. A green check means nothing failed, not that the code is tested.

The repository has three parts that need different test runners: the backend
in `src/` runs on Node, the web app in `web/` on React and Vite, and the mobile
app in `mobile/` on Expo and React Native.

Backend coverage is already above 80% for every metric, so a minimum can be
enforced from the start without blocking current work.

## Decision

We measure coverage of `src/` with c8 on every pull request. The result is
posted as one comment on the pull request, updated on every push, and in the
job summary of every run.

The unit and integration test jobs in `tests.yml` run under c8 and save their
raw coverage as artifacts. A third job, Backend coverage, merges them, checks
the rules below and posts the result.

Backend coverage fails when either rule is broken:

- **Minimum.** Lines, branches, functions and statements must each be at least
  75%.
- **Maximum drop.** On a pull request, no metric may drop more than 2
  percentage points compared with the latest successful run on `dev`.

Both values live in `.c8rc.json`. c8 checks the minimum; c8 does not support a
maximum drop, so `scripts/check-coverage-decrease.mjs` checks it.

## Consequences

Reviewers see backend coverage on every pull request.

A pull request cannot lower coverage below 75%, and cannot lower it a lot in
one go even while it stays above 75%.

Changing the rules needs a reviewed pull request, so the history shows who
changed them and why.

A coverage percentage shows which lines ran, not whether the tests check the
right things.

The maximum drop is compared with the latest `dev`, not with the commit the
pull request started from. If `dev` changes coverage while a pull request is
open, the comparison changes too. The 2 point margin absorbs most of that.

Until a run on `dev` has saved its coverage, there is nothing to compare with,
and only the minimum is checked.

The tests run once per pull request. A failing test turns only its own test
check red; Backend coverage still runs and reports, but checks the rules only
when every test passed, since coverage from a run with a failing test is
incomplete. Backend coverage waits for both test jobs, but merging takes
seconds, so the pipeline is not noticeably slower.

Only the Integration tests job needs a test database, so its setup exists in
one place.

Backend coverage blocks a merge only once it is added to the required status
checks of the `dev` ruleset.


## Alternatives considered

**Report only, with a minimum of 0.** The first version of this ADR. Rejected
once coverage was high enough to protect: a report alone does not stop
coverage from slowly dropping.

**Codecov or Coveralls.** History, a badge and per-PR diffs, but needs an
organisation admin to install an external service. Can be added later.

**Node's built-in coverage.** No extra dependency, but still experimental.

**A repository variable for the minimum.** Can be changed without a commit,
but the change is not in the git history and is unknown when running locally.

**A downloadable HTML report.** Few people download artifacts, and
`npm run test:coverage` gives the same report locally.

**Running the tests a second time in a separate coverage workflow.** Simpler,
with no artifacts passed between jobs, and not slower because the workflows
run in parallel. Rejected because everything the tests need from their
environment, such as the test database, would have to be set up identically in
both workflows. It also would not keep the checks apart: `c8 npm test` fails
when a test fails, so a failing test would turn the coverage check red too.


## Suggestions for later

These are not decided.

- Decide whether and how to measure web and mobile, for example with Vitest
  for web and jest-expo for mobile, each with its own minimum.
