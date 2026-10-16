# ADR 0007. Measure backend coverage in CI and start with a report-only minimum

**Status.** Proposed
**Date.** 2026-10-13
**Revised.** 2026-10-16: the tests run once and coverage is merged in a separate job.
**Deciders.** Kenneth Lykke Jensen, automation team
**Related backlog items.** NO-PBI

## Context

`tests.yml` runs unit and integration tests, but nothing measures what they
execute. A green check means nothing failed, not that the code is tested. On
`dev`, no test executes code in `src/`.

The repository has three parts that need different test runners: the backend
in `src/` runs on Node, the web app in `web/` on React and Vite, and the mobile
app in `mobile/` on Expo and React Native.

## Decision

We measure coverage of `src/` with c8 on every pull request. The result is
posted as one comment on the pull request, updated on every push, and in the
job summary of every run.

The unit and integration test jobs in `tests.yml` run under c8 and save their
raw coverage as artifacts. A third job, Backend coverage, merges them, checks
the minimum and posts the result.

The minimum coverage per metric lives in `.c8rc.json` and starts at 0, so the
check reports but never fails. It stays at 0 until the teams agree on values
for lines, branches, functions and statements, for example once `src/` has
tests worth protecting.

## Consequences

Reviewers see backend coverage on every pull request.

Changing the minimum needs a reviewed pull request, so the history shows who
changed it and why.

A coverage percentage shows which lines ran, not whether the tests check the
right things.

The tests run once per pull request. A failing test turns only its own test
check red; Backend coverage still runs and reports, but checks the minimum only
when every test passed, since coverage from a run with a failing test is
incomplete. Backend coverage waits for both test jobs, but merging takes
seconds, so the pipeline is not noticeably slower.

Only the Integration tests job needs a test database, so its setup exists in
one place.

When the minimum is raised above 0, Backend coverage is added to the required
status checks, so a pull request below the minimum cannot be merged.


## Alternatives considered

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
