# How we work in this repo

## Guides

- [`docs/instructions/create-issue.md`](docs/instructions/create-issue.md) — before the issue exists
- [`docs/instructions/working-on-issue.md`](docs/instructions/working-on-issue.md) — once it does
- [`docs/instructions/diagrams.md`](docs/instructions/diagrams.md) — before you draw

## Conventions

### Issues

- Name the issue `MET-A-<nr>` for the product and `MAN-A-<nr>` for managing the project. The number comes first in the title.
- Write the issue title so it can be understood without opening the issue.
- Create the branch from the issue: open the issue → right sidebar → **Create a branch**. The branch keeps the issue's number and title.

### Splitting issues

- Don't pull an issue into a sprint when it is larger than `L`. Split it first.
- When nobody can size the issue below `L`, it is not understood. Run research with an agreed deadline that clarifies the problem, then size it again.
- When one acceptance criterion depends on another being finished, you have two issues.
- When your branch has been open for more than a week, the issue was too large.

### Pull requests

- Title: `<type>: <description> [<nr>]`, for example `feat: reject reports without a timestamp [MET-A-13]`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Always open the pull request against `dev`.
- Merge `dev` into your branch right before you open the pull request: `git fetch origin && git merge origin/dev`.
- Split the pull request when it exceeds 400 changed lines.
- One issue per pull request. When you find a defect along the way, it becomes a sub-issue or an issue of its own.
- Check for reviews daily. `CODEOWNERS` assigns reviewers automatically.

### Stacked pull requests

- Waiting for another pull request to merge before you can start your issue? Use a stack.
- Is your work independent of that pull request, meaning it touches none of the same files? Don't stack. Open two pull requests against `dev` side by side.
- Stack at most three, because every change to the base pull request has to be carried into the stacked ones above it.

Do it like this:

1. Branch from the other pull request's branch instead of from `dev`: `git fetch origin && git checkout -b <your-issue> origin/<the-other-branch>`
2. Open the pull request with that branch as its base: `gh pr create --base <the-other-branch>`
3. Once the bottom is merged, change your pull request's base to `dev`: **Edit** next to the title → select `dev`.
4. Always merge from the bottom up. The bottom first.

### Docs

- Filenames: lower case and hyphens. `scenario-reference-data.md`, not `Diagram FINAL 3.drawio`.
- Open an issue before you fill in a sprint template.
- Don't create a file from a template before you have something to write in it.
- Don't create a directory for a single file.

## Where the documentation lives

Six folders under `docs/`, one row each. The folder says what the reader does with the file.

| Folder | The reader | What it holds |
|---|---|---|
| [`docs/instructions/`](docs/instructions/) | does something | How to create an issue: [`create-issue.md`](docs/instructions/create-issue.md). How to work on one: [`working-on-issue.md`](docs/instructions/working-on-issue.md). How to draw a diagram: [`diagrams.md`](docs/instructions/diagrams.md), [`entity-domain-model-guide.md`](docs/instructions/entity-domain-model-guide.md) and [`integration-evolving-guide.md`](docs/instructions/integration-evolving-guide.md). How to write or fix documentation, including with a language model: [`documentation-rules.md`](docs/instructions/documentation-rules.md) |
| [`docs/reference/`](docs/reference/) | looks something up | What a field in a scenario means: [`domain-model.md`](docs/reference/domain-model.md). Why a check is red, or an idea for automation: [`automation.md`](docs/reference/automation.md) |
| [`docs/adr/`](docs/adr/) | asks why something is the way it is | One architecture decision record (ADR) per decision |
| [`docs/records/sprints/`](docs/records/sprints/) | reads what happened in a sprint | Filled-in sprint documents, one set per sprint |
| `docs/records/other/` | reads what happened outside a sprint | Records that belong to no sprint. The folder appears with its first file |
| [`docs/templates/`](docs/templates/) | copies a blank form | A sprint or meeting template |

## Where new files go

```text
contracts/      interfaces other teams build against. Versioned
fixtures/       invented test data. Never anything from Metro Service
docs/           documentation, sorted into the six folders in "Where the documentation lives"
.github/        pull request template and automated checks
```

## The semester process

[The semester documentation](https://github.com/aau-cph-sw5/semester-docs).
