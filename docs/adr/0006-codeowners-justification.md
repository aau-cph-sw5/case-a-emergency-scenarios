# ADR 0006. Assign pull request reviewers by round robin within each team

**Status.** Proposed
**Date.** 2026-10-12
**Deciders.** DevOps team
**Related backlog items.** NO-PBI

## Context

Since pull request #99, merged on 2026-10-02, the file `CODEOWNERS` assigns reviewers. It gives each folder or file type to one of three GitHub teams: `CaseA-Group-7`, `CaseA-Group-9` and `CaseA-Group-10`. A line with `*` requests all three teams for any file that no other line matches.

In `CODEOWNERS`, GitHub uses the last line that matches a file. The file lists `*.md` and `*.js` for group 10 after `/docs/` and `/scripts/` for group 7, so group 10 wins those files. On `dev` at commit `144c436`, `CODEOWNERS` gives group 7 one file of 115: `scripts/check.mjs`. Of the 25 files in `docs/`, group 10 gets 24 and group 9 gets `docs/scenario-state/SeedDataScenario_1.json`.

No line covers `src/`, `web/src/` or the `.tsx` files in `mobile/`. These 33 files fall to the `*` line, so a pull request that changes application code requests all three teams. When GitHub requests a team, it notifies every member, and no single person is named as the reviewer.

Since we aim for everyone having approximately the same amount of reviews, the round robin is more sure to get everyone the same amount of reviews.

## Decision

We will delete `CODEOWNERS`. The author of a pull request requests review from the author's own team / the team that owns the issue, and GitHub's team auto assignment picks 1 reviewer from that team by round robin.

## Consequences

The author has to manually request which team to get the review from, the auto-assign only serves to pick a specific person from that team.

The team no longer maintains a list of paths. The ordering fault in the context section disappears with the file.

The author must request the team by hand, because `CODEOWNERS` did it on its own.

Round robin ignores how many reviews a member already has open. A member with three open reviews still gets the next one when their turn comes. GitHub skips a member whose status is set to **Busy**.

Each team needs its own code review settings, and only a team maintainer or an organization owner can change them.

A branch protection rule can no longer require a review from a code owner.

## Alternatives considered

**Keep `CODEOWNERS` and fix the order of its lines.** Moving `/docs/` and `/scripts/` below `*.md` and `*.js` would give group 7 its folders. Application code would still fall to the `*` line and request all three teams. But since everyone needs a good understanding of each part of the system, then it does not make sense to seperate responsibilities like this.

**Load balance instead of round robin.** Load balance counts each member's open reviews as well as their recent requests, and it aims for equal review counts over 30 days. But since we aim for everyone having approximately the same amount of reviews, the round robin is more sure to get everyone the same amount of reviews.