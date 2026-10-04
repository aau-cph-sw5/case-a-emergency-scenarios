# Work on an issue

Creating an issue is covered in [`create-issue.md`](create-issue.md).
Branches, pull request titles and the review rules live in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## How to

### Start on an issue

```bash
gh issue develop 42 --base dev --checkout
```

The command creates the branch from `dev`, links it to issue 42, and leaves you standing on it. `gh issue develop 42 --list` shows which branches already hang off the issue.

### Open the pull request

```bash
git push -u origin HEAD
gh pr create --base dev
```

GitHub links the pull request to issue 42, because the branch already is. You pick nothing under **Development**.

### Move the issue to Done

Drag the card on the board once the pull request is merged. `gh project item-edit` can do it too, but it needs four identifiers you have to look up yourself, so dragging is faster.

![The kanban view with the columns Ready, In progress, In review and Done](images/board-statuses.png)

## What things mean

### Status: who sets each value, and when

| Status | Who sets it | When |
|---|---|---|
| `Backlog` | The board | The issue is created or added to the board |
| `Ready` | You | At refinement, once Definition of Ready is met |
| `In progress` | You | When you start working |
| `Blocked` | You | When the item cannot be finished until Metro Service answers a question. Set `status:blocked` on the item, and `needs:metro` on the question. When the item only needs AAU work, the label is `status:refine` instead |
| `In review` | The board | When the pull request is linked to the issue |
| `Done` | You | When the pull request is merged and every acceptance criterion has been demonstrated |

### `Closes #42` does not work here

**`Closes #42`**: not interpreted. GitHub reads the keyword only in a pull request against the repo's default branch, and that is `main`, while our pull requests point at `dev`. So the issue has to be dragged to **Done** by hand.
