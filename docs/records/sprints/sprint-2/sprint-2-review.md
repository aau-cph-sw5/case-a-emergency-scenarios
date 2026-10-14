# Sprint 2 review

**Product:** Case A – Emergency Scenarios

**Date:** 12-10-2026  
**Present:** Groups, Product Owner, Metro attendees

## 1. What we said we would do

During Sprint 2, we finished the scenario domain mode and the database structure and the scenario state contract. 
We also prepared wireframes for the mobile application and the operator control room interface.

| Item | Title | Outcome |
|---|---|---|
| MET-A-001 | Derive the scenario domain model from the Metro alternative-operation presentations | Done |
| MET-A-002 | Scenario reference data schema, persistence and seed loader | Done (according to team, GitHub status to be updated) |
| MET-A-003 | Scenario state contract published and versioned | Done |

## 2. What we are demonstrating

### MET-A-001: Scenario domain model

**Driver:** Group 7

**What the audience will see**

Audience sees an entity model based on the Metro material, representing the relevant entities and relationships for emergency scenarios. 
this model provides the foundation for the database structure and further implementation later on

**Acceptance criteria**

- The entity model includes the relevant scenario concepts, including scenario identity, affected line, required stations, per-station role and the sequence of steward actions.
- Each entity is traceable to the Metro material or marked as an assumption.
- Differences between the M1/M2 and M3/M4 material are documented.
- The model has been reviewed with the Metro domain expert, with the outcome recorded.
- The timeboxed work has been closed, with remaining questions carried forward.


---

### MET-A-002: Scenario reference data schema

**Driver:**
ER Diagram: Group 7
Seed loader: Group 10 

**What the audience will see**

An ER diagram based on the entity model and Metro material, showing how the scenario data is structured and represented in the database.

**Acceptance criteria**

- The relational schema includes scenarios, required stations, station roles and action sequences, with referential integrity.
- A seed loader populates the database from a versioned file committed to the repository.
- The loader is idempotent and does not duplicate records when run multiple times.
- At least three real scenarios agreed with the Metro expert are present in the seed data.
- A scenario can be corrected by editing the source file and rerunning the loader without changing the code.



---

### MET-A-003: Scenario state contract

**Driver:** Group 7

**What the audience will see**



**Acceptance criteria**

- The contract covers scenario identity, version, activation state, required stations, per-steward assignment and the shape of a position report.
- The contract is committed to a shared repository path and reviewed by both teams at the first integration meeting.
- A machine-readable schema is published alongside the prose, with both clients validating against it in their test suites.
- The contract includes versioning, with breaking changes requiring a new version, a changelog entry and adoption by both teams within the same sprint.
- A stub server makes the contract available to the client team before the real implementation exists.
---
---
### MET-A-025: Authentication and role-based interface routing

**Driver:** Group 9

**What the audience will see**

As a user, I want to sign in and be given the interface and permissions for my role, so that I see what is relevant to my job and cannot act outside it.

**Acceptance criteria demonstrated**

- AC1: A steward login lands on the steward interface and an operator login on the control-room interface.

- AC2: Role is resolved server-side. A client cannot obtain a different interface by changing a request.

- AC3: Session expiry behaviour is specified, and an expired session does not silently discard queued offline reports.

- AC4: Test accounts for every role are seeded and documented for the other teams to use.

---
**Not met**
These PBIs were not initially planned as prioritised to be finished during Sprint 2 with the Product Owner, but were part of the sprint 2 backlog. 
004, 007, 008, 023. 
### Additional demonstrations: Wireframes

**Driver:**  Design team: Luna Winther, Sofus Blad Bjørkvad

**What the audience will see**

- Wireframes for the mobile application.
- Wireframes for the operator control room interface.

The wireframes demonstrate the proposed design and layout of the two interfaces and provide a foundation for further implementation.
It also provided a concrete example for the metro that we could base our questions on 

## 3. What we learned

- The entity model and ER diagram helped establish an understanding of how the Metro material should be represented in the system
- The DoD needs to be more visible in how we demonstrate and validate completed work
- We need to show the process of taking a PBI from the backlog through implementation, acceptance criteria and DoD validation
- The discussion of acceptance criteria last time was good, but we need to elaborate more on how we validate them fx with the Dod
- The presentation should show both the functionality and the reasoning behind our implementation decisions


### Feedback on the Sprint Review

- The overall presentation design was very good.
- Next time, include a few slides introducing the PBIs and what we have worked on.
- Present which PBIs were completed, what functionality they provide and why they were implemented.
- Demonstrate how the acceptance criteria and DoD have been fulfilled for each PBI.
- Explain our quality control procedures more clearly.
- Make the presentation more cohesive instead of having information spread across different places.
- Share the material beforehand so reviewers have time to prepare.
- The next review should communicate both the product and our development process more clearly and professionally.
- It would be nice if the questions aren't lumped together in one slide, but instead is shown during the presentation where relevant 
- Remember to dress professionally for the meetings 

## 4. Questions for Metro Service

| Item | Question | Why it matters |
|---|---|---|
| UI | Should the interface use buttons or sliders? | To determine the preferred way of interacting with the system. |
| Control room | How many users will use the system concurrently? | To understand the expected number of users. |
| Control room | What devices will the system be used on? | To determine the intended interface layout and screen requirements. |
| MET-A-001 | Is scenario versioning and rollback required, and what constitutes a new `ScenarioVersion`? | To determine how scenario versions should be handled in the data model. |
| MET-A-001 | Does a scenario need to be closed or deactivated, requiring `endedAt` and a `CLOSED` status? | To determine which scenario states and timestamps are necessary. |
| MET-A-001 | Should `reportedAt` and `arrivedAt` be recorded when stewards report in and arrive at stations? | To determine which timestamps should be included in the digital workflow. |
| MET-A-001 | Do M3/M4 stations have staffing windows similar to M1/M2? | To determine how staffing periods should be represented. |
| MET-A-001 | Is it necessary to identify which steward is manning a station? | To determine whether personal identification is required. |

## 5. Direction for next sprint

focus for Sprint 3 is implementing real-time scenario activation and logging when a scenario has been activated.
We will also improve how we demonstrate the development process, with clearer validation of acceptance criteria, DoD and quality control.
We will also improve communicatoin and time it takes to review pr so that less time is wasted waiting to wprk 

## 6. Decisions taken in the meeting

| Topic or question | Answer or decision | Source |
|---|---|---|
| UI interaction | Sliders were preferred over buttons. | Metro Service |
| Concurrent users | 4–5 users will use the system concurrently in the control room. | Metro Service |
| Control room devices | The system will be used on a normal computer screen | Metro Service |
| Scenario versioning | No answer recorded. Requirements for versioning, rollback and what constitutes a new `ScenarioVersion` still need clarification. | Not clarified |
| Scenario deactivation | Closing or deactivating a scenario would be useful, but is not necessary. | Metro Service |
| Station deployment timestamps | Recording when a steward reports in and arrives at a station could provide useful data but is not strictly necesssary | Metro Service |
| M3/M4 staffing windows | M3/M4 have staffing windows, but they are currently less strict than M1/M2. They may become equally strict next year but for now we should just assume they are similar. Carsten from Metro Service will look into what is relevant to give us | Metro Service |
| Steward identification | Identifying individual stewards is not required. Metro generally avoids identifying stewards by name for safety reasons | Metro Service |
| Steward tracking | Stewards use individually assigned phones, making tracking technically possible, but geotracking should not be used | Metro Service |


## After the review

- [x] Metro answers recorded on relevant Issues
- [x] Changed assumptions documented
- [x] Backlog updated
- [x] Dependencies updated
- [x] ADR created if a design decision changed
- [x] Next-sprint direction shared



