# ADR 0007. Measure application coverage in CI and require a minimum

**Status.** Proposed
**Date.** 2026-10-13
**Revised.** 2026-10-16: the tests run once and coverage is merged in a separate job.
**Revised.** 2026-10-19: require 75% and allow at most a 2 percentage point drop compared with `dev`, instead of only reporting.
**Revised.** 2026-11-02: require 80% combined line coverage across changed application files.
**Deciders.** Kenneth Lykke Jensen, automation team
**Related backlog items.** NO-PBI

## Context

When this ADR was proposed, `tests.yml` ran unit and integration tests but did
not measure what they executed. A green check means nothing failed, not that the code is tested.

The repository has three parts that need different test runners: the backend
in `src/` runs on Node, the web app in `web/` on React and Vite, and the mobile
app in `mobile/` on Expo and React Native.

The previous policy measured backend coverage against an overall minimum and a
maximum drop. It did not measure shared, web, or mobile application coverage.

## Decision

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
added. A missing or invalid coverage entry fails the check. For pull requests, the comparison uses the tested merge commit's first parent
(the base actually used by GitHub) and the tested merge commit. Merge queues
use the merge group's base commit. The check runs only after all three test
jobs pass.

Overall application line coverage is informational: there is no repository-wide
minimum or comparison with a previous run. The full contents of a changed file
are measured, including pre-existing lines; this is not changed-line coverage.
Scripts, configuration, assets and database migrations are not measured by this
policy. A percentage shows execution, not whether tests make useful assertions.

## Consequences

A small change to a previously untested file may require tests for existing code
in that file to reach 80% combined coverage. Coverage across changed files is
weighted, so coverage in one changed file can offset another. Execution does
not establish the quality of a test's assertions.

Dropping the overall minimum and maximum-drop rules allows overall coverage to
fall without blocking a PR. The overall figure remains visible in the report.
Missing or incomplete test coverage updates the comment as unavailable; when
all tests pass, missing coverage data fails the check. When a test fails, its
own test check reports the failure instead of enforcing incomplete coverage.

The Backend coverage job must be a required status check in the repository's
branch rules for this policy to block merging. SonarQube may have its own
independently configured quality gate.

## Alternatives considered

**Changed-line coverage.** Check only executable lines modified by the PR. This
would avoid requiring tests for untouched lines, but would leave existing code
in a touched file untested. The team chose full-file coverage to encourage
additional tests when working on a file.

**A lower threshold.** This would make edits to existing low-coverage files
less likely to be blocked, but would provide a weaker requirement for testing
changed files. The team chose 80%.

**Keep the previous overall minimum and maximum-drop rule.** This would protect
the repository-wide coverage baseline, but would also gate PRs on coverage
outside their changed files. The team chose a changed-file gate instead.
