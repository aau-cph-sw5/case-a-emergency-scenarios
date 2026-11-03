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

## Decision (revised 2026-11-02)

Node unit and integration tests collect c8 coverage. Jest also collects coverage
for shared, web and mobile application code. The coverage job combines the
results and publishes the same line coverage as an LCOV artifact for SonarQube.
On pull requests, files that differ between the tested merge and the PR head
are omitted from SonarQube's input so their line numbers cannot be misapplied.

On pull requests and merge queues, combined line coverage across added or
modified backend `src/**/*.ts`, `shared/**/*.{ts,tsx}`, `web/src/**/*.{ts,tsx}`,
`mobile/src/**/*.{ts,tsx}` and `mobile/App.tsx` files must reach **80%**.
Generated `shared/types/`, declaration files, and the startup entry points
`mobile/index.ts` and `web/src/main.tsx` are excluded. For
frontend files, Jest defines executable lines and Node test hits on those same
lines are combined with Jest hits. Each line is counted once, even when both
runners cover it. Backend lines use c8's coverage map.

The percentage is weighted by executable lines: covered lines divided by total
lines across the changed files. The report shows an 80% indicator for each file,
but individual results do not block the check. Files with no executable lines
contribute nothing. Deleted files are ignored; renamed files are treated as
added. A missing or invalid coverage entry fails the check. The comparison uses
the event's base commit and the tested merge commit, and the check runs only
after all three test jobs pass.

Overall application line coverage is informational: there is no repository-wide
minimum or comparison with a previous run. The full contents of a changed file
are measured, including pre-existing lines; this is not changed-line coverage.
Scripts, configuration, assets and database migrations are not measured by this
policy. A percentage shows execution, not whether tests make useful assertions.

The Backend coverage job must be a required status check in the repository's
branch rules for this policy to block merging. SonarQube may have its own
independently configured quality gate.
