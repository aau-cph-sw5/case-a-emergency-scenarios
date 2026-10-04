# Work on an issue

Creating an issue is covered in [`create-issue.md`](create-issue.md).
Branches, pull request titles and the review rules live in [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## How to

### Start on an issue and set `In progress`

```bash
gh issue develop 42 --base dev --checkout
```

Put the number of your issue in place of `42`.

The command creates the branch from `dev`, links it to issue 42, and leaves you standing on it. `gh issue develop 42 --list` shows which branches already hang off the issue.

No board sets `In progress`, so move the card yourself:

1. Open the board the issue is on: [Case A. Emergency Scenarios](https://github.com/orgs/aau-cph-sw5/projects/3) or [Management](https://github.com/orgs/aau-cph-sw5/projects/10).
2. Drag the card to the column **In progress**.

### Open the pull request

```bash
git push -u origin HEAD
gh pr create --base dev
```

GitHub links the pull request to issue 42, because the branch already is. The board Case A. Emergency Scenarios then sets `In review`.

**When the pull request is stacked:** GitHub links nothing while the base is another branch than `dev`. [`CONTRIBUTING.md`](../CONTRIBUTING.md) says when you change the base to `dev`.

### Get the issue to `Done`

Once every acceptance criterion has been demonstrated, merge the pull request. The merge closes issue 42, and the board then sets `Done`.

**When the issue is still open after the merge:** the pull request had no link to the issue. Close the issue yourself, and the board sets `Done`:

```bash
gh issue close 42
```

## What things mean

### Status on the board Case A. Emergency Scenarios: who sets each value

Six values, one row each.

| Status | Who sets it | When |
|---|---|---|
| `Backlog` | The board | When the issue is added to the board |
| `Ready` | You | At refinement, the meeting before a sprint where the team splits and sizes items, once [Definition of Ready](https://github.com/aau-cph-sw5/semester-docs/blob/main/CONVENTIONS.md#definition-of-ready) is met |
| `In progress` | You | When you start working |
| `Blocked` | You | When the item cannot be finished until Metro Service answers a question |
| `In review` | The board | When the pull request is linked to the issue |
| `Done` | The board | When the issue closes |

### Status on the board Management: who sets each value

Five values, one row each.

| Status | Who sets it | When |
|---|---|---|
| `Todo` | The board | When the issue is added to the board |
| `MØDER` | You | [?] |
| `Future` | You | [?] |
| `In progress` | You | When you start working |
| `Done` | You or the board | When you drag the card, or when the issue closes |

### Workflows: what each board does on its own

Eight workflows, one row each. The names are the ones on the board's page **Workflows**.

| Workflow | Board | What it does |
|---|---|---|
| Item added to project | Both | Sets `Backlog` on Case A. Emergency Scenarios and `Todo` on Management |
| Pull request linked to issue | Both | Sets `In review` on Case A. Emergency Scenarios. On Management: [?] |
| Item closed | Both | Sets `Done` when the issue closes |
| Auto-close issue | Both | Closes the issue when you set `Done` |
| Auto-add sub-issues to project | Both | Adds a sub-issue when its parent is on the board |
| Item reopened | Case A. Emergency Scenarios | [?] |
| Code changes requested | Case A. Emergency Scenarios | [?] |
| Pull request merged | Management | [?] |

### Labels: `status:blocked`, `needs:metro`, `status:refine`

Three labels for an item that waits, one row each.

| Label | Sits on | When |
|---|---|---|
| `status:blocked` | The item | When the item cannot be finished until Metro Service answers a question |
| `needs:metro` | The question | When Metro Service has to answer it |
| `status:refine` | The item | When the item only needs AAU work |

### `Closes #42`: GitHub closes issue 42 when the pull request merges

GitHub reads `Closes #42` in a pull request against the repo's default branch, and the default branch is `dev`. When that pull request merges, GitHub closes issue 42. A pull request from a branch made with `gh issue develop` needs no keyword, because the branch already links the pull request to the issue.
