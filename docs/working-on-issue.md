# Work on an issue

Creating an issue is covered in [`create-issue.md`](create-issue.md).
Branches, pull request titles and the review rules live in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## How to

### Start on an issue

```bash
gh issue develop 42 --base dev --checkout
```

The branch is created from `dev`, linked to issue 42, and you are standing on it. `gh issue develop 42 --list` shows which branches already hang off the issue.

### Open the pull request

```bash
git push -u origin HEAD
gh pr create --base dev
```

The pull request is linked to issue 42 because the branch is. You pick nothing under **Development**.

### Move the issue to Done

Drag the card on the board once the pull request is merged. `gh project item-edit` can do it too, but it needs four identifiers you have to look up yourself, so dragging is faster.

![The kanban view with the columns Ready, In progress, In review and Done](images/board-statuses.png)

## What things mean

### Statuses

| Status | Who sets it | When |
|---|---|---|
| `Backlog` | The board | The issue is created or added to the board |
| `Ready` | You | At refinement, once Definition of Ready is met |
| `In progress` | You | When you start working |
| `Blocked` | You | When the issue is waiting. Also set the label `status:blocked`, and `needs:metro` when it waits on Metro |
| `In review` | The board | When the pull request is linked to the issue |
| `Done` | You | When the pull request is merged and every acceptance criterion has been demonstrated |

### Views on the Case A board

**`All Items`**: every top-level issue with status, assignees, linked pull requests and sub-issue progress.
**`Overview - parent/child`**: the hierarchy between issues and their sub-issues.
**`Kanban - Items`**: grouped by status.
**`Sub-issues`**: sub-issues only, kept out of the main overview.
**`My items`**: only what is assigned to you.
**`group-7`, `group-9`, `group-10`**: one view per group. Not all of them are set up yet.

### Views on the Management board

**`Backlog`**: meeting issues with status `MØDER` as the parent, with the agreements from the meeting as sub-issues.
**`Board`**: the columns `MØDER`, `Todo`, `In progress`, `Done`.
**`Current iteration`**: only what is active in this sprint.
**`Roadmap`**: a timeline of items.
**`My items`**: only what is assigned to you.

### Keywords that do not work here

**`Closes #42`**: not interpreted. GitHub reads the keyword only in a pull request against the repo's default branch, and that is `main`, while our pull requests point at `dev`. So the issue has to be dragged to **Done** by hand.
