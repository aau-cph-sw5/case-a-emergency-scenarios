# Sprint 4 retrospective. Nexus Groups 7, 9 and 10, Case A

**Date.** 2026-11-09  
**Present.** Representatives from Groups 7, 9 and 10.  
**Facilitator.** Theocharis.

---

## The numbers

For Sprint 4, we planned three main PBIs and two stretch items.

| PBI | Planned work | Priority | Outcome |
|---|---|---|---|
| MET-A-011 | Control-room interface | Main | Done |
| MET-A-010 | Steward graphical scenario overview | Main | Done |
| MET-A-013 | Steward location and position reporting | Main | Requirements moved into MET-A-015 |
| MET-A-009 | Scenario stand-down | Stretch | Done |
| MET-A-004 | Real-time updates | Stretch | Done |

We completed two of the three main PBIs and both stretch items. The remaining main PBI, MET-A-013, was changed during the sprint because the original requirements did not quite match the workflow we ended up agreeing on with Metro. The remaining functionality is now being handled under MET-A-015.

Other work completed during the sprint included MET-A-005, the offline steward view. MET-A-006 and MET-A-015 were still in progress at the end of the sprint.

We also noticed a clear improvement in how PRs were handled. At the retrospective, the only PRs still open were mainly those opened during the weekend.

## What went well

### PRs and reviews improved

One of our main problems in the previous sprints was that PRs would remain open for too long, which made it difficult to continue working on dependent changes.

This was much better during Sprint 4. Reviews were happening more regularly, and we had fewer PRs waiting to be merged.

At the retrospective, the remaining open PRs had mostly been created during the weekend, which was a noticeable improvement compared with previous sprints.

### We got further with the integrated MVP

During Sprint 4 planning, we were concerned that we might end up with features that worked individually but were not properly integrated.

We managed to demonstrate the operator and steward applications working together on the real server, including scenario activation, live status updates and stand-down.

Not everything was finished, particularly the revised station status flow, but we got much closer to having the full MVP working as one system.

### The interactive Sprint Review worked well

One of our goals was to have something Carsten could actually try himself instead of only presenting slides or explaining how we intended the application to work.

We achieved this, and it gave us much more useful feedback.

Carsten could try the operator interface, ask questions about how things worked, and explain where our assumptions differed from how Metro actually operates.

Daniel Russo also commented positively on this and pointed out that our understanding of the product was becoming more aligned with the customer's.

### The groups have become more independent

We felt that the groups were getting better at working independently and taking responsibility for their own tasks.

Compared with earlier sprints, the main problems were no longer about getting individual groups to work or make progress.

Instead, the issues were more about what happens when the work overlaps between groups, and who should be responsible for communicating and making decisions in those situations.

### Monday meetings with Theo

Having regular meetings with Theo on Mondays was considered useful.

A lot of our questions come up while we are actively working on the PBIs, so being able to discuss them before the Sprint Review helps us avoid waiting until the end of the sprint.

We also discussed that it might be useful if Theo could stay a little longer during these meetings, especially when we have several requirements that need clarification.

### Process metrics

The survey results were generally positive, and we could see improvements in areas such as automation and refinement.

The improvement in PR flow was also reflected in the metrics.

We did not go through the exact numbers in these notes, but the general impression was that our development process had become more consistent.

## What did not

### Communication between groups was still a problem

While the groups were becoming better at working independently, communication was still difficult when one group's work affected another.

During the integration meeting, we discussed a situation where Group 9 had not received information about changes to the steward/mobile flow that affected their work.

Some of the information had been discussed elsewhere, and parts of the implementation were already available in `dev`, but the group responsible for the affected functionality had not necessarily been involved in those decisions.

This led to confusion about what had been changed, what still needed to be done, and who was responsible for updating the PBIs.

We agreed that being able to work independently is important, but it should not mean making decisions that affect another group's work without involving them.

### Responsibility and ownership were sometimes unclear

Some of the communication problems came from how we had divided the work between frontend, mobile and backend.

That division makes sense technically, but the actual PBIs often involve several of those areas.

When someone identifies a problem or comes up with an idea that affects another group's work, it is not always clear who should take responsibility for refining it or asking the PO.

We discussed that the group responsible for implementing a feature should be involved in decisions about that feature.

Rather than one person communicating with the PO on another group's behalf, it would make more sense to bring the issue to the relevant group and let them take part in the discussion.

### We could have prepared refinement earlier

We felt that we were not always as prepared as we would have liked when discussing PBIs with Theo.

Some dependencies and unclear requirements only became apparent once development was already underway.

We discussed having cross-team refinement about a week before the Sprint Review, so we can go through the candidate PBIs for the next sprint together.

That would give us time to identify dependencies, discuss how the PBIs fit together and prepare questions before meeting with Theo.

It would also mean we could start working earlier in the next sprint instead of spending the first part figuring out how everything should be divided.

### Information was not always handed over properly

Some information had been communicated through Discord or conversations, but was not included in the meeting minutes.

During the integration meeting, Kenneth mentioned that he had checked the minutes referred to in Discord, but the information the other group needed was not actually there.

This made it difficult to tell whether information had been properly handed over or whether everyone was working from their own assumptions.

We need to be more consistent about recording decisions and making sure the groups affected by them know where to find the information.

### Integration meetings could have more structure

We generally felt positive about the integration team and the way it has developed.

However, we also discussed that we do not really have a clear Scrum Master role.

Some members have naturally started taking responsibility for organizing meetings, writing things down and keeping discussions moving, but it is not something we have formally assigned.

We also felt that some meetings were being led by Theo rather than having a discussion facilitated by someone from the project.

We discussed whether it would be worth trying an actual Scrum Master role for one sprint, with someone from the integration team taking responsibility for facilitating the meetings.

That would also give us something to evaluate and discuss in the semester report.

## Where we lost time

### Misunderstandings between groups

Some time was spent clearing up misunderstandings about changes to the steward and operator flows.

In one case, the communication problem was only discovered after looking at another group's PR.

By that point, work had already been done based on different assumptions about how the functionality should behave.

It would have been easier to discuss the changes directly with the affected group before implementation.

### Unclear ownership of PBI refinement

The changes surrounding MET-A-013, MET-A-014 and MET-A-015 required additional communication and refinement.

Some questions were taken directly to the PO, while the groups responsible for related work did not necessarily have the same understanding of the changes.

This meant extra time was spent figuring out what had been agreed and how the requirements should be updated.

### Different assumptions about the development environment

There was also some confusion about whether parts of the system were still using the stub server or the real backend.

Some functionality had been available on `dev` since Friday, but this had not been clearly communicated to everyone.

As a result, there were different impressions of how much of the workflow was actually finished and available to demonstrate.

We need to be better at communicating when functionality is merged and where the working version can be tested.

### Large PRs and review dependencies

Although PR reviews improved overall, large PRs could still cause problems.

If someone had a large PR waiting for review, they could end up being blocked from continuing their own work.

We discussed whether it would make sense to agree on review expectations, including how long a PR should normally wait and when to ask someone else to review it.

The idea was that groups should first try to handle delayed reviews internally rather than making every review problem an integration team responsibility.

## Cross-team

### Cross-team refinement before the next sprint

We discussed introducing a shared refinement session approximately one week before the Sprint Review.

The idea is that we look at the candidate PBIs together before dividing them between groups.

This would give us an opportunity to identify which PBIs depend on each other, which groups need to collaborate, and what questions we need to ask Theo.

The individual groups could then refine the relevant PBIs further and bring their findings back to integration.

This should help prevent situations where one group starts implementing something without realizing that another group is making changes to the same workflow.

### Let the relevant group own its requirements

When an idea or problem affects a feature owned by another group, we should bring it to that group rather than trying to solve everything ourselves.

The relevant group should then be involved in contacting the PO, refining the PBI and deciding how to implement the change.

Integration should help make sure the groups communicate and understand their dependencies, rather than becoming responsible for making every decision.

### Better handover between groups

We should make sure important decisions are written down somewhere the other groups can actually find them.

When changes have been merged to `dev`, we should also communicate what has changed and how the functionality can be tested.

This is particularly important when a change affects another group's PBIs or the shared demo.

### PR review expectations

We discussed making a shared agreement about PR reviews.

Some of the questions we want to decide are:

- How quickly should a PR receive its first review?
- How long should someone wait before requesting another reviewer?
- How quickly should requested changes be reviewed again?
- How long is it reasonable for a PR to remain open?
- When should the integration team follow up on delayed reviews?

No specific time limits were agreed during the meeting.

The general suggestion was to handle review delays within the responsible group first, and involve integration if they become a cross-team problem.

### Trying a Scrum Master role

We discussed whether we should try having a formal Scrum Master within the integration team for one sprint.

The role would mainly involve facilitating meetings, keeping discussions focused and making sure decisions and action points are recorded.

We could then evaluate at the next retrospective whether it made a difference.

We also discussed different ways of organizing the integration team, including having a main representative and a substitute from each group, or having larger weekly meetings alongside shorter daily Nexus Scrum meetings.

These were suggestions rather than final decisions.

### Definition of Done

We discussed updating the shared Definition of Done.

Some points had been added and some wording had been changed, but the final version still needs to be agreed and communicated between the groups. Will be done by integration.

### AI tools and confidential information

We also briefly discussed the use of AI tools such as Claude and Mistral.

The general view was that people should be able to use the tools they are comfortable working with.

However, sensitive Metro information and confidential documents should not be shared with external AI assistants.

## One improvement for next sprint

**Improvement.**

Introduce cross-team refinement before the next Sprint Review and planning.

Each group should prepare the PBIs they expect to work on, identify dependencies and bring questions or concerns to the shared refinement.

We should go through the PBIs together before deciding how to divide them, so the groups have a better understanding of where their work overlaps.

The relevant groups should then refine their own PBIs and communicate the results back to integration.

**Owner.**

Nexus Integration Team. A specific person to coordinate the refinement still needs to be agreed.

**How we will know.**

At the next retrospective, we can look at whether we managed to hold the refinement before planning and whether the dependencies were identified early enough.

We should also consider whether the groups felt better prepared for discussions with Theo, and whether we had fewer misunderstandings about ownership or overlapping requirements during the sprint.

## Carried over from last time

At the beginning of Sprint 4, we identified several risks based on what had happened during Sprint 3.

| Previous concern | What happened in Sprint 4 |
|---|---|
| Too much work committed | We completed two of the three main PBIs and both stretch items. The remaining main PBI was changed and moved into MET-A-015. |
| PRs stacking up | This improved considerably. The remaining open PRs had mostly been opened during the weekend. |
| Features working separately but not being integrated | We demonstrated the operator and steward applications working together on the real server, although some parts of the workflow still need to be finished. |
| Dependencies and package changes causing conflicts | We still had communication and dependency problems, particularly when work overlapped between groups. |
| Operator interface not being usable enough | Carsten tried the interface himself and responded positively to the design and workflow. |
| Usability testing being premature | We are considering testing on 19 November, but still need to agree on the goals, measurements and whether the relevant functionality is ready. |

The biggest improvement from the previous sprint was how we handled PRs and how far we got with the integrated MVP.

We are also getting better at working independently within our groups.

The main thing we need to improve now is how we handle the work that overlaps between groups, especially when requirements change or decisions affect someone else's PBIs.
