# Sprint 4 planning

**Group 7, 9, 10, Case A**

**Date:** 26-10-2026  
**Present:** Groups; Theo (PO)

## Sprint Goal

Complete the core MVP workflow connecting the control-room interface and the steward mobile application.

A steward should be able to check in at a station and have their status reflected live in the operator interface, allowing operators to see which required stations are manned. 
Operators should also be able to update and stop an active scenario.

An interactive demo for Carsten that showcases the MVP.  
## Selected PBIs

| PBI | Short title | Owner(s) | Estimate |
|---|---|---|---|
| MET-A-011 | Control-room interface and functionality | To assign | L |
| MET-A-010 | Steward graphical scenario overview | To confirm | L |
| MET-A-013 | Steward location and position reporting | To assign | M |
| MET-A-009 | Additional MVP functionality (stretch item) | To confirm | Not estimated |
| MET-A-004 | Remaining real-time propagation functionality (stretch item) | To confirm | Not estimated |

**Prioritisation**

- MET-A-011, MET-A-010 and MET-A-013 are the main planned items.
- MET-A-009 and MET-A-004 are lower-priority items to consider only if the main sprint work is completed.
- The goal is to finish the functionality agreed for the MVP rather than introduce unnecessary additional scope.
- Some unfinished Sprint 3 work is close to completion and may be carried into Sprint 4.

Theo considered Sprint 3 somewhat optimistic in scope, although significant progress had been made. 
The Sprint 4 scope should reflect the remaining integration work and potential PR delays.

The backlog and sprint scope can be looked at again during the regular Monday meeting with Theo.

## Cross-group dependencies

| Our PBI | We need | From group | Needed by | Agreed action |
|---|---|---|---|---|
| MET-A-011 | Working steward check-in and position reporting to update station coverage | Team responsible for MET-A-013 | During Sprint 4 | Agree on the position-reporting contract and integrate with the control-room interface. |
| MET-A-013 | Working real-time communication between mobile and operator clients | Team responsible for MET-A-004 | During Sprint 4 | Coordinate transport and message formats through the integration team. |
| MET-A-010 | Offline scenario data and local-copy integration | Team responsible for MET-A-005 | During Sprint 4, if included in scope | Confirm whether the remaining offline functionality is required for completion. |
| MET-A-011 | Scenario activation, reference data and incident logging available on the shared branch | Teams responsible for MET-A-002, MET-A-007 and MET-A-023 | Before integration testing | Verify that relevant PRs are merged and compatible. |

Exact group ownership and delivery dates need to be agreed by the relevant teams.

## Blocking or Metro questions

| PBI | Question | Impact | Who raises it |
|---|---|---|---|


## Risks and assumptions

**Risk or assumption: Too much work committed to the sprint**

Sprint 3 had an optimistic scope, resulting in multiple incomplete items.

**What we will do**

Focus on the three main planned items and keep MET-A-009 and MET-A-004 as optional work. 
Reassess scope with Theo when necessary rather than accumulating additional unfinished features.

**Risk or assumption: PRs stacking up and delaying integration**

Long-running PRs, delayed reviews and merge conflicts slowed progress in Sprint 3.

**What we will do**

Keep the number of open PRs as low as practical, prioritise reviews and merging existing work, and coordinate dependencies through the integration team.

**Risk or assumption: Features work independently but are not integrated**

Several features were demonstrated in Sprint 3 before being fully merged and verified on the shared branch.

**What we will do**

Prioritise integration and end-to-end testing. 
Verify that features satisfy the Definition of Done, including a green pipeline on the shared branch.

**Risk or assumption: Dependencies and package updates create conflicts**

Changes to shared dependencies and package lockfiles can cause integration problems across teams.

**What we will do**

Coordinate dependency updates and prefer separate, focused PRs for package changes when appropriate.

**Risk or assumption: The operator interface is functional but not sufficiently usable**

The existing interface demonstrates functionality, but the wireframes show opportunities for improving clarity and usability.

**What we will do**

Use the operator wireframes and Carsten's feedback as guidance. Prepare a practical, interactive demo where Carsten can use the application directly.

**Risk or assumption: Usability testing may be premature**

The full MVP workflow may not yet be sufficiently integrated to support meaningful usability testing in sprint 5.

**What we will do**

Consider postponing formal usability testing to sprint 6 if the necessary functionality is not ready. 
Reassess this based on progress.

## Integration expectations

### We expect to provide

- An operator interface showing required stations and live staffing status.
- Functionality allowing steward check-ins and position reports to update the control-room overview.
- Operator functionality for managing and stopping scenarios.
- Completed PBIs integrated into the shared branch with passing tests.
- Updated interface contracts and documentation for any changes affecting other teams.
- A more complete end-to-end workflow that can be demonstrated interactively to Metro.

### We expect to receive

- Completed and merged scenario activation functionality.
- Working scenario reference data and event logging.
- Reliable communication between the steward mobile application and operator interface.
- Agreed data contracts for steward position and station staffing status.
- Reviews and integration support from the other groups.
- Clarification of remaining offline functionality and MVP requirements from the PO.

## Before planning ends

- [ ] Selected PBIs meet the Definition of Ready
- [x] Dependencies are visible
- [x] Blocking questions are known
- [ ] Owners are agreed
- [ ] Cross-group dependencies have been discussed
- [x] The Sprint Goal is understood by the group

### Additional planning observations

- Christian recommended displaying the Product Backlog throughout planning to make selection and capacity discussions clearer.
- The team should be realistic about what can be completed and negotiate scope with the PO if necessary.
- Partially implemented work does not count as Done.
- PR review and integration capacity should be considered when estimating how much work can be delivered.
- A hands-on customer demonstration is becoming more feasible as the MVP functionality develops.
- A static analysis tool is required to provide an overview of code quality and maintainability.
