# Sprint 3 review. Project A

**Date.** 2026-10-26  
**Present.** Anders, Luna, Mathias K., Sofus, Elias (AAU presenters); 
Carsten (Metro Service); 
Russo and Christian (feedback).

---

## What we said we would do

**Sprint goal:** An operator activates a scenario from real reference data, the activation is logged, and connected clients, including a steward phone with no signal, show it.

| Item | Title | Outcome |
|---|---|---|
| MET-A-002 | Scenario reference data schema, persistence and seed loader | Done – carried over from Sprint 2 and completed |
| MET-A-008 | Required staffing for the active scenario shown to the operator | Done – all acceptance criteria met |
| MET-A-023 | Append-only incident event log with actor and timestamp | Partly – all acceptance criteria implemented, but still in progress |
| MET-A-004 | Real-time propagation of scenario and position changes to connected clients | Partly – initial functionality implemented; staging and remaining criteria incomplete |
| MET-A-010 | Steward graphical scenario overview | Partly – 3 of 5 acceptance criteria implemented, awaiting merge |
| MET-A-007 | Operator selects and activates a scenario from the predefined list | Partly – all 5 acceptance criteria implemented, but some changes still in PR |
| MET-A-005 | Active scenario and own assignment readable with no network | In progress – offline functionality not completed |
| MET-A-011 | Control-room functionality | In progress |

The sprint goal has been partially achieved. 
Scenario activation, logging, connected-client updates and the operator staffing overview were shown and demonstrated
Offline access and parts of the real-time functionality are still not finished.

Some features were demonstrated from feature branches without a fully green pipeline on the shared branch.
These are not considered Done according to the Sprint 3 Definition of Done.

## What we are demonstrating

The demonstration began with an overview of the PBIs and continued with a live walkthrough of the operator web interface and steward mobile application.

1. **MET-A-025 – Authentication and routing (live demonstration).**
   - Login functionality on both the web and mobile clients.
   - Navigation to the relevant operator and steward interfaces.
   - Demonstrated as supporting functionality; acceptance criteria completion was not separately reported.

2. **MET-A-002 – Scenario reference data (Anders).**
   - Relational schema storing scenarios, required stations, station roles and action sequences.
   - Seed loader reading data from a versioned repository file.
   - Re-running the loader without creating duplicates.
   - Editing scenario data without changing application code.
   - At least three example scenarios available.
   - All 5 acceptance criteria satisfied.

3. **MET-A-007 – Scenario selection and activation (Mathias K).**
   - Operator selects a scenario from predefined reference data.
   - Scenario activation includes a confirmation step.
   - The activated scenario becomes visible in the control room.
   - Server-side restriction of one active scenario per line.
   - Activation is recorded with actor and timestamp.
   - All 5 acceptance criteria implemented; final changes were still in PR.

4. **MET-A-008 – Required staffing shown to the operator (Elias).**
   - Required stations and roles displayed for the active scenario.
   - Stations ordered geographically or by Metro line order.
   - Station status communicated through colour and non-colour indicators, including symbols and numbers.
   - Required and currently covered station counts visible without interaction.
   - All 4 acceptance criteria satisfied.

5. **MET-A-004 – Real-time propagation (Elias).**
   - Demonstrated scenario information reaching the steward client.
   - Demonstrated position reporting and communication between clients.
   - Initial implementation of the first three acceptance criteria presented.
   - The required performance measurements on staging with 25 simulated clients were not completed because the implementation was not yet deployed to staging.
   - Message ordering, disconnected-client detection and the remaining requirements were not fully completed.

6. **MET-A-023 – Append-only incident event log (Mathias K).**
   - State-changing actions recorded as events with type, actor, subject, payload and server timestamp.
   - Single event-writing entry point.
   - Append-only behaviour verified by tests.
   - Server timestamp used as the authoritative timestamp.
   - Versioned and documented event schema.
   - Event writing included in the same transaction as the recorded change.
   - All 6 acceptance criteria implemented; final Done status was not confirmed.

7. **MET-A-010 – Steward graphical scenario overview (MathiasK).**
   - Graphical representation of the affected Metro section.
   - Steward's own assignment distinguished from other stations.
   - No horizontal scrolling required.
   - 3 of 5 acceptance criteria implemented on a feature branch.
   - Accessibility font-size verification still in progress.
   - Reading from the offline local copy remains dependent on MET-A-005.

8. **MET-A-013 – Steward location reporting (live demonstration).**
   - Steward selects a station and reports their location.
   - Position information is sent towards the operator room.
   - Demonstrated functionality; full acceptance-criteria status was not reported.

9. **Operator and steward interface wireframes (Sofus).**
   - Presented an improved visual design for the operator interface, matching the steward application.
   - Central map, scenario selection panel and station staffing overview.
   - Visual distinction between affected stations and stations requiring staffing.
   - Confirmation dialogue for scenario activation.
   - Event history and steward status information.
   - Option to toggle Metro lines and search for stations or scenarios.
   - These were design proposals rather than completed functionality.

## What we learned

**Scenario and line organisation**
Carsten clarified that scenarios should be separated between M1/M2 and M3/M4. 
The map should similarly focus on the relevant line group, and during an active scenario show only the affected lines.

Scenario names should communicate the affected stretch, such as a disruption between two stations, rather than  random identifiers.

**Operator information requirements**

It is important that the operator can clearly see the different routes and destinations of trains during a scenario.
Search functionality should support both stations and lines. 
Destination IDs dont need to be searchable.

**Metro infrastructure and terminology**

Carsten clarified several internal emergency shaft infrastructure abbreviations:

- ØSØ – Østersøgade emergency shaft.
- NØP – Nørrebroparken emergency shaft.
- SBD – Sønder Boulevard emergency shaft.
- HAH – Havneholmen emergency shaft.
- TGV – Teglholmsgade emergency shaft.
- GÅB – Gåsebæk emergency shaft.

A pendulum service, such as one running between Kongens Nytorv and Orientkaj, also stops at intermediate stations.

Turnaround infrastructure allows trains to change direction, including movements involving Østerport and nearby shafts.

**Reference data and naming**

The system should use Metro's internal station names rather than supporting multiple alternative names for the same station.

Track switches and internal abbreviations may be included in the project GitHub repository. 

**Concurrent scenarios**

Carsten explained that handling two unrelated scenarios simultaneously would add significant complexity. 
Such situations can be managed manually instead of implementing automatic merging or coordination of multiple scenarios.

**Value of visual demonstrations**

Carsten said that seeing the system visually helps him assess whether the project is moving in the intended direction and identify further possibilities.
Christian said that interactive demonstrations and dialogue generate more useful feedback than presentations alone.

## Questions for Metro Service

The following questions were discussed and clarified during the review.

| Item | Question | Why it blocks us |
|---|---|---|
| MET-A-007 | How should scenarios be organised and named? | Determines scenario selection and reference-data presentation. |
| MET-A-007 / MET-A-011 | Should operators see the entire Metro network or only relevant lines? | Determines map filtering and operator workflow. |
| MET-A-011 | Which route and destination information must be shown? | Required to design an operationally useful control-room interface. |
| MET-A-002 | What do the internal shaft and infrastructure abbreviations mean? | Necessary for correctly interpreting reference data. |
| MET-A-002 | Can internal infrastructure identifiers be stored in GitHub? | Determines how reference data can be documented and shared. |
| MET-A-002 | Should stations support multiple names? | Determines reference-data and search behaviour. |
| MET-A-007 | Must the system support multiple simultaneously active unrelated scenarios? | Would significantly increase scenario-state and coordination complexity. |
| MET-A-011 | Should search include destination identifiers? | Defines the required search scope. |

## What we intend next sprint

Sprint 4 will focus on completing the MVP workflow from the operator control room to the steward mobile application. 
Stewards should be able to check in at stations and have their status reflected live in the control room, while operators should be able to manage and stop active scenarios.

The highest-priority items are MET-A-011, MET-A-010 and MET-A-013. MET-A-009 and remaining MET-A-004 work may be considered if capacity allows. The team will prioritise finishing and integrating existing work over starting additional features.

## Decisions taken in this meeting

| Question | Answer | Who said it |
|---|---|---|
| How should scenarios be organised? | Separate M1/M2 and M3/M4 scenarios. | Carsten |
| What should the map display? | Separate line groups and show only relevant affected lines during a scenario. | Carsten |
| How should scenarios be named? | Use descriptive names indicating the affected section or stations. | Carsten |
| What operator information is particularly important? | Different train routes and destinations must be clearly visible. | Carsten |
| What should search support? | Stations and lines; destination identifiers are not required. | Carsten |
| Should stations have multiple names? | No. Use Metro's internal station names. | Carsten |
| Can infrastructure abbreviations and track-switch information be committed to GitHub? | Yes, for the project repository. | Carsten |
| Does a pendulum service stop at intermediate stations? | Yes. | Carsten |
| Should the system handle multiple unrelated active scenarios automatically? | No. Such situations can be handled manually. | Carsten |
| Must the applications look identical across the different projects? | No. | Carsten |

### Feedback on the Sprint Review process

**Christian**

- Sharing progress was valuable, but the most useful part was the direct dialogue with Carsten.
- Include questions throughout the demonstration rather than saving all questions until the end.
- Explain why particular design alternatives were selected, including relevant ADRs.
- Let Carsten interact directly with the software during future demonstrations.
- Use a visible Product Backlog during planning to support realistic scope selection.
- Reassess commitments during the sprint and negotiate scope with the PO when necessary.
- A feature that is almost finished is not Done.

**Russo**

- Praised the professional presentation and progress.
- Recommended improving the flow between the agenda, demonstration and discussion.
- Questions for Metro should be prepared and clearly identified before the review.
- Emphasised customer interaction, transparency, maintainability and delivering value.
- Highlighted the need for a static code-analysis tool such as CodeScene to maintain an overview of the codebase.
- Raised concerns about stacked PRs, merge conflicts and excessive parallel work.
- Asked the teams to consider how Nexus and its integration practices can help manage shared-repository bottlenecks.

