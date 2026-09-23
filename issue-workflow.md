# Issue workflow

We use two shared boards across all three teams building Case A. This is how an issue moves through each one, so everyone works with issues the same way regardless of team.

## Case A board: product backlog

https://github.com/orgs/aau-cph-sw5/projects/3/views/2

For the feature backlog: the MET-A-xxx items that make up the product itself.

![Case A board](case-a-board-screenshot.png)
<img width="2606" height="1426" alt="image" src="https://github.com/user-attachments/assets/c13e7b8a-5f9a-4067-92a0-4e8fb053e623" />


Statuses, in the order an item normally moves through them:

| Status | Meaning | Who moves it here |
|---|---|---|
| No Status | Just added, not yet triaged | Whoever files the issue |
| Backlog | Queued; not yet ready to pull into a sprint | Product Owner / refinement |
| Ready | Meets Definition of Ready: user story, acceptance criteria that can each fail, size at most L, named dependencies, no unanswered blocking question (semester-docs/02-ways-of-working.md) | Whoever refines it |
| In progress | Pulled into the current sprint and being actively worked | The team/person picking it up, at sprint planning or when they start |
| Blocked | Waiting on an unanswered question (often Metro Service, relayed through the Product Owner) or a dependency on another PBI | Whoever hits the blocker |
| In review | A pull request is open against `development` for this item | Whoever opens the PR |
| Done | Merged to `development`, every acceptance criterion demonstrated, CI green (Definition of Done) | Whoever merges, or the Product Owner at sprint review |

No automation is configured on this board (only "auto-add sub-issues to project" is on), so every move above is a manual step you make yourself as part of doing the work.

That one automation matters if you break a backlog item into sub-issues: each sub-issue gets added to this project automatically. It moves through the same statuses as everything else, but it's tracked on the separate "Sub-issues" view rather than the main "Kanban - Items" view you'd normally look at, so breaking an item down doesn't clutter the top-level board. The parent card also shows a small count like `0 / 4`: that's how many of its sub-issues are done out of the total.

![The parent card's progress count on the board](parent-card-progress-example.png)

![A parent issue's sub-issues list](sub-issues-list-example.png)

To create one, open the parent MET-A issue and scroll down to the "Create sub-issue" button under its Sub-issues section.

Labels, independent of status:
- `status:blocked`: flag alongside whatever column the card is actually in
- `needs:metro`: carries an open question for Metro Service; stays on until the Product Owner brings back an answer

Because three teams share this one board and one codebase, a status has to mean the same thing regardless of which team owns the card. Don't invent per-team shortcuts here. A team needing finer-grained tracking handles that on the Management board instead.

## Management board: setup and logistics

https://github.com/orgs/aau-cph-sw5/projects/10

For cross-team management and setup work that isn't itself a product feature: repo/tooling setup, meeting notes, presentations, and similar coordination tasks.

![Management board](management-board-screenshot.png)

Columns: MØDER (meeting-note items), Todo, In progress, Done.

Movement here is manual, the same as on the Case A board.

## Which board for which issue

If the issue is a MET-A-xxx backlog item (something Metro or the Product Owner would recognize as a product feature), it goes on the Case A board and follows the manual statuses above. If it's about running the project itself (setting something up, preparing a ceremony, an internal task with no user-facing acceptance criteria), it goes on the Management board, moved by hand through Todo, In progress, and Done, the same manual process as the Case A board.
