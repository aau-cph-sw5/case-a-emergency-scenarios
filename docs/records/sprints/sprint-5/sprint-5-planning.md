# Sprint 5 planning

**Group 7, 9, 10, Case A**

**Date:** 09-11-2026  
**Present:** Representatives from Groups 7, 9 and 10, PO Theocharis.

---

## Sprint Goal

For Sprint 5, we want to finish as much of the remaining MVP functionality as possible, particularly the last parts of the steward application and the functionality they depend on so that we can do the usability test at the start of sprint 6. 

We also want to make sure the frontend and backend are properly integrated, so we can test the complete flow rather than individual features.

Alongside development, we will start preparing usability testing and begin distributing work on the semester report.

The intention is to have most of the remaining steward functionality finished during this sprint, leaving the last sprints for outstanding features, testing, refactoring, documentation and handover.

## Selected PBIs

During planning, we went through the remaining PBIs and discussed which ones should be prioritized and how the work could be divided between Groups 7, 9 and 10.

| PBI | Short title / planned work | Owner(s) | Estimate |
|---|---|---|---|
| MET-A-027 | Steward frontend functionality | Distributed across groups / to confirm | TBD |
| MET-A-019 | Scenario suggestions | Group 9 | TBD |
| MET-A-016 | Functionality needed before MET-A-017 and MET-A-018 | Group 10 | TBD |
| MET-A-017 | Remaining steward functionality | Group 10 | TBD |
| MET-A-018 | Remaining steward functionality | Group 10 | TBD |
| MET-A-006 | Finish remaining functionality | To confirm | TBD |
| MET-A-015 | Complete revised steward station status flow | To confirm | TBD |

### Other planned work

Besides the PBIs, we discussed a few tasks that also need attention during the sprint.

| Task | Owner(s) | Notes |
|---|---|---|
| Usability test planning | To distribute between groups | Considering testing on 19 November |
| Frontend/backend rebase and integration | Group 7, to confirm | Make sure the different parts work together on the real server |
| Semester report | Kathrine to organize initial tasks | Create report issues and distribute sections between group members |
| Backlog cleanup | Relevant PBI owners / integration | Review redundant or outdated PBIs and acceptance criteria |

### PBI prioritization and backlog cleanup

**MET-A-016, 017 and 018**

MET-A-016 was identified as a blocker for MET-A-017 and MET-A-018.

Since 017 and 018 are among the last missing parts of the steward view, we want to prioritize getting 016 out of the way so that work on the remaining functionality can continue.

**MET-A-012**

We discussed whether MET-A-012 is still relevant, since parts of its functionality are already being handled or completed through other PBIs.

We need to check what, if anything, is still missing before deciding whether it should remain open.

**Issue #138**

Issue #138 was mentioned as redundant and something that could potentially be closed.

This should be checked against the existing implementation and backlog before closing it.

**MET-A-006**

MET-A-006 is still in progress and should be finished during Sprint 5.

Its status also needs to be clearly reflected on the Kanban board.

**MET-A-013, 014 and 015**

Following the Sprint Review, MET-A-013 is being incorporated into MET-A-015 because the requirements for steward reporting have changed.

MET-A-014 has a redundant acceptance criterion that should be removed so the PBI can be marked Done.

MET-A-015 will continue with the revised station status flow based on Carsten's feedback.

## Cross-group dependencies

During planning, we discussed the importance of finding dependencies before the groups start working on their individual PBIs.

Some of the remaining functionality depends on work from another group, and we want to avoid situations where one group is ready to continue but is waiting for another part of the system.

| Our PBI | We need | From group | Needed by | Agreed action |
|---|---|---|---|---|
| MET-A-017, 018 | MET-A-016 completed | Group 10 | Before completing 017 and 018 | Prioritize 016 so the remaining steward work is not blocked |
| MET-A-027 | Agreed steward frontend flow and relevant backend functionality | Relevant groups | During Sprint 5 | Coordinate implementation and changes between groups |
| MET-A-015 | Shared understanding of the revised check-in, check-out and station coverage flow | Groups working on mobile, web and backend | Before integration | Update the requirements and coordinate the implementation |
| MET-A-019 | Clarification of scenario suggestion behavior and its integration with the existing application | Group 9 and relevant backend group | During Sprint 5 | Refine the functionality and agree on any required interfaces |
| Frontend/backend integration | Compatible branches and working functionality on the real server | Groups 7, 9 and 10 | During Sprint 5 | Coordinate rebasing and integration |
| Usability testing | A working steward flow and agreed test objectives | All groups | Before the planned test | Divide test preparation and agree on what we want to measure |

One of the things we want to improve from Sprint 4 is making sure the relevant groups are involved when requirements or designs affecting their work are changed.

Rather than one person refining something on behalf of another group, we should discuss the issue with the group responsible for implementing it.

This should also make it easier to identify dependencies before they become blockers.

## Blocking or Metro questions

We received several clarifications from Carsten during the Sprint Review, particularly about steward station reporting.

Some of these require changes to existing PBIs, while other questions still need to be discussed with the PO.

| PBI | Question | Impact | Who raises it |
|---|---|---|---|
| Stub server / related PBI | Can we remove the stub server now that we use the real server, even though it was part of an existing PBI? | Shaping | Integration / PO |
| MET-A-012 | Is there any functionality left that is not already covered by other PBIs? | Shaping | Relevant group / PO |
| MET-A-015 | How should the revised station status requirements be reflected in the acceptance criteria? | Shaping | Relevant group / PO |
| Messaging | Should we implement nonurgent messages from stewards to operators, and what should the scope be? | Shaping | Relevant group / PO |
| Usability testing | What do we want to measure, and which parts of the steward flow should be tested? | Shaping | Testing group / PO |

### Questions clarified during Sprint 4 Review

The following points were discussed with Carsten and should be reflected in the relevant PBIs:

- Stewards do not need geolocation verification when checking in.
- Stewards should not need operator approval to check out.
- The operator mainly needs to know whether stations are staffed, rather than which individual steward is where.
- Stewards do not need to mark every individual task as completed.
- The original 30-second staleness requirement was not considered necessary by Carsten.
- Stewards should acknowledge a new scenario when the active scenario changes.
- Nonurgent messaging could be useful, while important communication should continue over radio.

## Risks and assumptions

### MET-A-016 blocking the remaining steward functionality

**Risk or assumption**

MET-A-017 and MET-A-018 depend on MET-A-016. If 016 is delayed, it could prevent us from finishing the remaining steward functionality during the sprint.

**What we will do**

Prioritize MET-A-016 and make sure its progress is visible to the groups working on the dependent PBIs.

### Cross-team communication and ownership

**Risk or assumption**

During Sprint 4, we experienced situations where changes affecting another group's work were not communicated clearly enough.

This could happen again when we refine or implement the remaining PBIs, particularly where mobile, web and backend functionality overlap.

**What we will do**

Make sure changes are discussed with the relevant groups before implementation.

The group responsible for a feature should be involved in refining its requirements and asking the PO questions about it.

### Frontend and backend integration

**Risk or assumption**

Although the real server is now being used, there is still some integration and rebasing work to do.

We also experienced confusion in Sprint 4 about which functionality was available on `dev` and which parts still depended on the stub server.

**What we will do**

Coordinate the remaining frontend/backend integration and communicate when functionality is available on the shared development branch.

We should also make sure everyone knows how to run the complete flow before demonstrations and testing.

### PRs delaying dependent work

**Risk or assumption**

PR handling has improved, but large PRs and delayed reviews can still block other work.

**What we will do**

Continue prioritizing reviews and try to keep PRs small enough to be reviewed without unnecessarily blocking further development.

If a PR is waiting too long, the responsible group should try to resolve it internally before bringing it to integration.

We also discussed agreeing on clearer expectations for how quickly PRs should be reviewed.

### Usability testing might not be ready

**Risk or assumption**

We are considering a usability test on 19 November, but the remaining steward functionality may not be completed in time.

We also have not yet agreed on the goals, tasks or measurements for the test.

**What we will do**

Start planning the test early in the sprint.

A group or responsible members should define what we want to measure and which tasks participants should perform.

We will then assess whether the application is ready for meaningful testing on the proposed date.

### Too much work for the sprint

**Risk or assumption**

There are several remaining PBIs, along with integration work, usability testing preparation and report tasks.

We need to be realistic about how much can be finished during Sprint 5.

**What we will do**

Prioritize the functionality needed for the MVP and the PBIs that are blocking other work.

If necessary, we will adjust the scope rather than beginning more work than we can finish.

## Integration expectations

### We expect to provide

- Progress on the remaining MVP PBIs, particularly MET-A-016, 017, 018 and 027.
- Completion of MET-A-006.
- Updated requirements and implementation of the revised steward status flow in MET-A-015.
- Frontend and backend functionality integrated with the real server.
- Clear communication when changes affect another group's work.
- A plan for usability testing, including what we want to test and how we will measure it.
- Report-related issues that can be distributed between group members.
- Updated PBI statuses and relevant documentation.

### We expect to receive

- Completion of the functionality that other groups depend on, particularly MET-A-016.
- Reviews and integration support when PRs affect multiple groups.
- Clarifications from the PO about redundant or changed PBIs.
- Agreement on how we divide usability test preparation.

## Before planning ends

- [ ] Selected PBIs meet the Definition of Ready
- [x] Dependencies are visible
- [x] Blocking questions are known
- [ ] Owners are agreed
- [x] Cross-group dependencies have been discussed
- [x] The Sprint Goal is understood by the group

Some ownership, estimates and backlog changes still need to be confirmed before the sprint plan can be considered fully finalized.

---

## Looking ahead to Sprints 6 and 7

During planning, we also discussed how much work we expect to have left after Sprint 5.

### Sprint 6

If we manage to finish the planned MVP functionality during Sprint 5, we expect to have relatively few remaining product items.

We discussed that there might be around three items left for Sprint 6, depending on how much we complete now.

This could include the remaining messaging functionality, outstanding PBIs and anything identified through usability testing.

### Sprint 7

We expect the final sprint to focus more on:

- Finishing the semester report.
- Refactoring and cleaning up the code.
- Improving comments and documentation where needed.
- Maintaining and preparing the codebase for the next year's student team.
- Final testing and the last Sprint Review.

The aim is to avoid leaving major unfinished development work until the final sprint, so we have time to finish the report and make sure the project can be handed over properly.
