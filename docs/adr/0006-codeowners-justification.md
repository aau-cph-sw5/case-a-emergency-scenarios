# ADR 0006. Request one reviewer from each team by round robin

**Status.** Proposed
**Date.** 2026-10-12
**Deciders.** DevOps team
**Related backlog items.** NO-PBI

## Context

Since pull request #99, merged on 2026-10-02, the file `CODEOWNERS` assigns reviewers. It gives each folder or file type to one of three GitHub teams: `CaseA-Group-7`, `CaseA-Group-9` and `CaseA-Group-10`. A line with `*` requests all three teams for any file that no other line matches.

In `CODEOWNERS`, GitHub uses the last line that matches a file. The file lists `*.md` and `*.js` for group 10 after `/docs/` and `/scripts/` for group 7, so group 10 wins those files. On `dev` at commit `144c436`, `CODEOWNERS` gives group 7 one file of 115: `scripts/check.mjs`. Of the 25 files in `docs/`, group 10 gets 24 and group 9 gets `docs/scenario-state/SeedDataScenario_1.json`.

No line covers `src/`, `web/src/` or the `.tsx` files in `mobile/`. These 33 files fall to the `*` line, so a pull request that changes application code requests all three teams. When GitHub requests a team, it notifies every member, and no single person is named as the reviewer.

Everyone needs a good understanding of every part of the system, so splitting review responsibility by folder does not fit how we work. We also aim for every member to do about the same number of reviews.

## Decision

We will reduce `CODEOWNERS` to the global fallback line only:

    * @aau-cph-sw5/CaseA-Group-7 @aau-cph-sw5/CaseA-Group-9 @aau-cph-sw5/CaseA-Group-10

Every pull request then requests all three teams. Each team turns on code review auto assignment with these settings:

- assign **1** member per review request
- routing algorithm **Round robin**
- **only notify the requested team members**, so the rest of the team is not notified

Every pull request therefore gets one named reviewer from each team, and within each team the reviews rotate between the members.

## Consequences

Every pull request gets three named reviewers, one from each team, without the author doing anything. Knowledge of every part of the system spreads across all three teams.

The ordering fault in the context section disappears, because the file has only one line. The team no longer maintains a list of paths.

Each member reviews roughly one in every N pull requests, where N is the number of members in their team. Teams of different sizes therefore have different review loads per member.

GitHub never assigns the author of a pull request as its reviewer. In the author's own team, the next member in the rotation is picked instead.

Round robin ignores how many reviews a member already has open. A member with three open reviews still gets the next one when their turn comes. GitHub skips a member whose status is set to **Busy**.

Each team needs its own code review settings, and only a team maintainer or an organization owner can change them. If a team turns off auto assignment, the whole team is requested again and no single person is named.

A branch protection rule can still require a review from a code owner. Approval from any one of the three assigned reviewers satisfies it, because all three teams own every file. If we want all three teams to approve, the rule must also require three approving reviews. GitHub counts approvals, not teams, so this only works if each reviewer actually approves.

## Alternatives considered

**Keep `CODEOWNERS` and fix the order of its lines.** Moving `/docs/` and `/scripts/` below `*.md` and `*.js` would give group 7 its folders. Application code would still fall to the `*` line and request all three teams with no named reviewer. It would also keep review split by folder, which does not fit our aim that everyone understands every part of the system.

**Delete `CODEOWNERS` and let the author request one team.** The author would request the author's own team or the team that owns the issue, and auto assignment would pick one reviewer from it. Each pull request would get only one reviewer, so knowledge would spread less between teams. The author would also have to remember to request a team by hand.

**Load balance instead of round robin.** Load balance counts each member's open reviews and recent requests, and aims for equal review counts over 30 days. Round robin gives each member the next review in a fixed order, which matches our aim of equal review counts more directly and is easier to predict.