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

## Writing documentation

Write a documentation file in two passes. You write it with AI first, and then the prompt in [`docs/instructions/documentation-prompt.md`](docs/instructions/documentation-prompt.md) reviews it and repairs it.

1. Pick the type of your file in the table under **Types and folders**. The type gives the folder.

2. Cd to that folder.

3. Open [`documentation-prompt.md`](docs/instructions/documentation-prompt.md) on GitHub and click **Copy raw file**, the icon next to **Raw** at the top of the page.

4. Insert prompt into your preferred LLM, and write the type on its first line of the prompt - fx:

   ```text
   Type: Reference
   ```

5. Paste the prompt under that line, and paste your file.

6. Replace your file with the repaired one, and fill in every `[?]` the model left.

#### Types and folders

| Type | Pick it when the file holds | Folder |
|---|---|---|
| Instruction | What a programmer must do in a situation, such as creating an issue or drawing a diagram | [`docs/instructions/`](docs/instructions/) |
| Reference | An explanation of code or configuration that affects the program directly, such as the data model or a workflow | [`docs/reference/`](docs/reference/) |
| ADR | Why we chose something. One architecture decision record (ADR) per decision | [`docs/adr/`](docs/adr/) |
| Sprint record | What happened in one sprint | [`docs/records/sprints/`](docs/records/sprints/) |
| Other record | Meeting notes, other kinds of notes. | `docs/records/other/` |
| Template | Blank form for different purposes | [`docs/templates/`](docs/templates/) |

**When your file fits two types:** split it into two files, one per type.

**When no type fits:** Put into "other" for now - propose a new type in an issue before you write the file.

## Docs conventions

- Filenames: lower case and hyphens. `scenario-reference-data.md`, not `Diagram FINAL 3.drawio`.
- Open an issue before you fill in a sprint template.
- Don't create a file from a template before you have something to write in it.
- Don't create a directory for a single file.
- When your pull request makes a document wrong, fix the document in the same pull request.
- When you move a rationale to `docs/adr/`, write the decision there in the same pull request.

**When a rule in the prompt does not work in practice:** propose a change in an issue, and follow the rule until the issue is settled. The structure works only when it is the same across the files.

Rules 1.1, 2.6, 2.8, 2.9 and 2.11 in the prompt come from the Diátaxis framework, Carroll's minimalist instruction, information foraging theory and the seductive-details effect.

## Where new files go

```text
contracts/      interfaces other teams build against. Versioned
fixtures/       invented test data. Never anything from Metro Service
docs/           documentation. "Writing documentation" names the folder for each type
.github/        pull request template and automated checks
```

## The semester process

[The semester documentation](https://github.com/aau-cph-sw5/semester-docs).
