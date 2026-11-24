# Sprint 6 planning

**Groups 7, 9 and 10, Case A**

**Date:** 23-11-2026  
**Present:**  Group 7, 9 and 10 + Theo

## Sprint Goal

Complete the remaining functionality and documentation, conduct and analyse the usability evaluation with Metro Service, and prepare the system for final handover.

The focus is on finishing and verifying existing work, resolving outstanding acceptance criteria, and ensuring that the final product is stable and sufficiently documented.

## Selected PBIs

The remaining PBIs were reviewed and prioritised according to their current progress, importance to the evaluation and expected workload.

Estimates were not consistently recorded during planning and need to be confirmed where relevant.

| PBI | Short title | Owner(s) | Estimate |
|---|---|---|---|
| MET-A-012 | Remaining flow documentation and ADR | Existing PBI owner | TBD – documentation only |
| MET-A-018 | Steward notifications | Anas, Anders | TBD |
| MET-A-019 | Scenario suggestions and comparison | Existing PBI owner | TBD – minor remaining work |
| MET-A-021 | Steward station tasks | To be assigned | TBD |
| MET-A-024 | Analyst role / remaining work | Group 11 , pending confirmation | TBD |
| MET-A-026 | Role and permission matrix | To be assigned | TBD – primarily documentation |
| MET-A-027 | Usability evaluation | Sofus, Kathrine, Mathias B and test team | TBD |
| MET-A-028 | Handover | To be assigned | TBD |
| MET-A-029 | Station chat | Existing PBI owner | TBD – minor remaining work |
| MET-A-030 | Admin dashboard | Noah | TBD – close to completion |
| MET-A-031 | Steward map improvements | To be assigned | TBD – small |
| MET-A-022 | Dispatch message drafting | Scope to be transferred to a new PBI | TBD |

### PBI status and remaining work

**MET-A-012 – Remaining documentation**

The implementation is approximately 95% complete. The remaining work is primarily documenting the new flow in an architecture decision record.

The ADR should explain the deviations from the original design and why the changes were made. This is important for demonstrating how our design evolved throughout the project.

The PBI is expected to be completed during Sprint 6.

**MET-A-018 – Steward notifications**

Anas has been working on the implementation, while Anders will continue the remaining work. A status update is needed to establish exactly what remains.

Ideally, the implementation should be ready by Wednesday so it can be reviewed and deployed to staging.

**MET-A-019 – Scenario suggestions**

The main functionality is largely completed.

The remaining work is the comparison and evaluation, which has been moved from the now-closed MET-A-020 into MET-A-019.

The comparison is expected to be relatively small. We need to clarify with Theo how extensive it should be to satisfy the acceptance criteria without introducing unnecessary work.

**MET-A-021 – Steward station tasks**

The PBI has been refined based on feedback from Karsten.

Rather than implementing a checklist, the functionality should display the tasks assigned to stewards at a station.

The necessary task information is expected to already exist in the available scenario material.

The implementation has not started and requires final refinement.

**MET-A-024 – Analyst role**

The PBI has not been completed and its ownership needs to be clarified.

We will contact the person previously responsible and ask for a clear confirmation by Wednesday regarding whether they intend to complete it and whether they need assistance.

If they are no longer able or willing to complete the work, the remaining teams have sufficient capacity to take it over if it is still considered necessary.

The communication and any reassignment should be documented, including previous attempts to clarify responsibilities and the involvement of the supervisor.

The functionality is not considered essential for the upcoming usability evaluation.

**MET-A-026 – Role and permission matrix enforced server-side**

This PBI was postponed because implementing the complete permission matrix earlier in development was not considered necessary at that stage.

The intended functionality is to enforce role-specific permissions for individual actions, preventing users from performing actions outside their assigned permissions.

Currently, the system is designed to expose the functionality relevant to each user role. However, this should not be presented as equivalent to enforcing every permission server-side.

The PBI should be refined to reflect what is currently implemented and what would be required for a complete server-side permission matrix.

Given the remaining time, the priority is to document the current approach and describe stronger permission enforcement as a possible future extension.

**MET-A-027 – Usability evaluation**

The test plan has been completed and the evaluation is scheduled for 25 November at Metro Service.

The test setup and supporting documents are available in OneDrive and Sofus' documentation.

The team will meet at 10:00 on 24 November to verify the functionality and introduce everyone to the test procedure.

The application must work on the mobile devices used during the evaluation.

The focus is to test stable, completed functionality rather than making last-minute changes or attempting to demonstrate features that are not ready.

After the evaluation, the observations and interview findings will be analysed and used to identify necessary improvements.

Theo will not attend the evaluation and should be updated afterwards.

**MET-A-028 – Handover**

The handover PBI is planned for the final sprint and has not yet started.

The work should ensure that the final system, documentation and any relevant limitations are understandable to someone who needs to continue development.

**MET-A-029 – Station chat**

The functionality is mostly completed.

There is one remaining area that needs clarification to determine whether it is significant enough to implement before the end of the project.

Some remaining work from MET-A-026 may be moved into MET-A-029 if it fits the existing scope and acceptance criteria.

**MET-A-030 – Admin dashboard**

Noah is continuing the implementation, which is close to completion.

The dashboard supports administration of users, roles and scenarios.

This functionality also provides a useful alternative to manually importing predefined scenarios, since authorised users can create and manage scenario data through the application.

The approach therefore supports future extensions and makes the system easier to maintain.

Changes affecting staging need to be communicated more consistently, as previous merges were made without clearly informing the other groups.

**MET-A-031 – Steward map improvements**

This PBI follows feedback about the information stewards need when guiding passengers during an active scenario.

The steward map should reflect the relevant information from the operator map, including how trains are running and how passengers should navigate the affected area.

The PBI has not started but is considered a relatively small task, expected to be addressed shortly.

**MET-A-022 – Dispatch message drafting from scenario templates**

The intended functionality may already be partly covered by the messaging implementation.

Rather than leaving the original requirement unaddressed or duplicating existing work, the relevant acceptance criteria should be moved into a new, smaller PBI where appropriate.

MET-A-022 should then be closed with a comment explaining where the remaining requirements were moved and why.

This provides traceability and makes it clear that the requirement was reconsidered rather than simply skipped.

### Overall PBI overview

| Status | PBIs |
|---|---|
| Mostly completed | MET-A-012, MET-A-019, MET-A-029, MET-A-030 |
| In progress | MET-A-018, MET-A-027 |
| Not started / requiring refinement | MET-A-021, MET-A-024, MET-A-026, MET-A-031 |
| Deferred to final sprint | MET-A-028 |
| To be restructured and closed | MET-A-022 |

## Cross-group dependencies

| Our PBI | We need | From group | Needed by | Agreed action |
|---|---|---|---|---|
| MET-A-018 | Completion, review and staging integration of notifications | Current owners / integration | 25-11-2026, ideally | Anders continues implementation; confirm Anas' progress and arrange review |
| MET-A-019 | Clarification of the expected comparison and evaluation scope | Theo / PBI owner | During Sprint 6 | Discuss how extensive the final comparison needs to be |
| MET-A-024 | Confirmation of ownership and whether assistance is needed | Group 11 / current assignee | 25-11-2026 | Contact the assignee and request a final confirmation |
| MET-A-027 | Stable operator and steward functionality on mobile devices | All contributing groups | 24-11-2026 | Verify the functionality together before the evaluation |
| MET-A-029 | Clarification of remaining functionality and potential overlap with MET-A-026 | Relevant PBI owners | During Sprint 6 | Determine whether remaining work belongs in MET-A-029 |
| MET-A-030 | Communication of staging changes and integration of admin functionality | Noah / integration | During Sprint 6 | Ensure changes are communicated and reviewed |
| MET-A-031 | Existing operator map information and relevant scenario data | Operator and steward contributors | During Sprint 6 | Align the steward map with the information already represented in the operator map |
| Shared report | Section ownership and cross-group review | Groups 7, 9 and 10 | Before final submission | Assign sections and reviewers through Trello |
| Handover | Final implementation status and documentation from all groups | Groups 7, 9 and 10 | Final sprint | Coordinate outstanding documentation and known limitations |

## Blocking or Metro questions

| PBI | Question | Impact | Who raises it |
|---|---|---|---|
| MET-A-019 | How extensive should the final comparison and evaluation be? | Shaping | Theo / integration team |
| MET-A-024 | Is this functionality still important enough to prioritise in the remaining time? | Shaping | Theo / integration team |
| MET-A-026 | Is documenting the current permission approach and a future server-side implementation sufficient for the remaining scope? | Shaping | Theo / integration team |
| MET-A-027 | Are the selected workflows and test conditions suitable for evaluating the intended system? | Shaping | Usability team / Metro Service |
| MET-A-029 | Does the remaining functionality add sufficient value to justify implementing it now? | Detail | PBI owner / integration team |
| MET-A-030 | Are there any remaining requirements regarding user and scenario administration that need to be included? | Detail | PBI owner / Metro Service |

The remaining questions are primarily about scope and prioritisation rather than major technical blockers.

## Risks and assumptions

**Risk or assumption – Usability test readiness**

Some functionality remains unfinished shortly before the usability evaluation. Last-minute implementation changes could introduce errors or interfere with the test.

**What we will do**

Meet on 24 November at 10:00 to verify the complete test flow, ensure the application works on the required mobile devices, and introduce the test team to the procedure.

We will focus on functionality that is ready and avoid making unnecessary last-minute changes.

**Risk or assumption – Remaining PBI scope**

Several PBIs are nearly complete but still have acceptance criteria that require clarification or additional work.

**What we will do**

Refine the remaining scope, prioritise the requirements that contribute most to the final product, and document any decisions to merge, move or postpone functionality.

**Risk or assumption – Unclear ownership**

MET-A-024 does not currently have confirmed ownership, which creates a risk that the work remains unfinished without a clear decision.

**What we will do**

Contact the previous assignee and request a response by Wednesday. If ownership is not confirmed, determine whether another developer should take over or whether the work should be deprioritised.

Keep a record of the communication and decision.

**Risk or assumption – Integration and staging**

Changes to the shared staging environment have previously been made without sufficient communication.

**What we will do**

Ensure that changes affecting shared environments are communicated through the integration team and relevant channels.

**Risk or assumption – Final documentation workload**

The shared report, individual reports and handover documentation need to be completed alongside the remaining development work.

**What we will do**

Divide shared report sections between groups through Trello, record the responsible authors, and assign reviewers from other groups.

Each person is expected to take responsibility for approximately four sections of the shared report.

We will also arrange a working weekend in early December to help complete the remaining work. The dates discussed were 27–28 November or 4–5 December, with the final date still to be confirmed.

## Integration expectations

### We expect to provide

- An updated overview of remaining PBIs, their owners, dependencies and completion status.
- Communication of changes affecting shared contracts, functionality and staging.
- A stable version of the operator and steward applications for the usability evaluation.
- Results and observations from the usability test, including findings that require changes to the product.
- Clarification and documentation of any PBIs that are merged, replaced, postponed or reduced in scope.
- Contributions to the shared report and reviews of sections written by other groups.
- Relevant technical documentation, ADRs and implementation information for the final handover.

### We expect to receive

- Confirmation of ownership and progress on outstanding PBIs.
- Timely reviews of PRs affecting shared functionality.
- Updates about changes that affect other groups or the shared staging environment.
- Clarification of outstanding requirements and the expected scope of final implementation work.
- Feedback and contributions to the shared report from the other groups.
- A coordinated overview of the remaining work leading up to the final delivery.

## Before planning ends

- [ ] Selected PBIs meet the Definition of Ready
- [x] Dependencies are visible
- [x] Blocking questions are known
- [ ] Owners are agreed
- [x] Cross-group dependencies have been discussed
- [x] The Sprint Goal is understood by the group

The remaining actions are to confirm ownership of outstanding work, complete the necessary refinement, clean up the Kanban board, and ensure that the selected PBIs are ready for implementation.

The incoming integration team will coordinate the remaining dependencies and maintain the overview throughout the sprint.
