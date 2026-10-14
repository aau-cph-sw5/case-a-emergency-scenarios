# ADR 0007. Measure backend coverage in CI and start with a report-only minimum

**Status.** Proposed
**Date.** 2026-10-13
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

The tests run twice per pull request: once in `tests.yml` and once under c8 in
`coverage.yml`. The jobs run in parallel, so the pipeline is not slower, and
runner minutes are free for this public repository. Keeping them apart means
test failures and too-low coverage show as separate checks. Revisit this if the repository becomes private, since runner minutes then
count against a monthly limit.


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

**Running the tests once and passing coverage data to a separate job.** Avoids
running the tests twice, but the coverage data has to be passed between jobs
as artifacts. That adds complexity without a noticeable gain: the test and
coverage jobs already run in parallel, so the second run does not make the
pipeline slower, and runner minutes are free for this public repository.


## Suggestions for later

These are not decided.

- Decide whether and how to measure web and mobile, for example with Vitest
  for web and jest-expo for mobile, each with its own minimum.
