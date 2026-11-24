# Sprint 5 review. Emergency Scenarios

**Date.** 2026-11-23  
**Present.** Groups 7, 9 and 10, Metro Service representative Karsten, AAU supervisors Russo and Theo.

---

## What we said we would do

The main goal of Sprint 5 was to finish the remaining MVP functionality and integrate the system end-to-end in preparation for usability testing.

Several PBIs made significant progress but were carried over to Sprint 6 for their remaining implementation, testing, review or documentation.

| Item | Title | Outcome |
|---|---|---|
| MET-A-006 | Offline reports | Done |
| MET-A-018 | Steward notifications | Partly – notification implementation and testing remain |
| MET-A-019 | Scenario suggestions | Partly – comparison and evaluation remain |
| MET-A-027 | Usability evaluation | Partly – test plan completed, execution and analysis carried over |
| MET-A-029 | Station chat | Partly – main functionality implemented, remaining criteria to be clarified and completed |
| MET-A-030 | Admin dashboard | Partly – implementation ongoing, with remaining scope to be evaluated |

MET-A-016 and MET-A-017 were replaced by MET-A-029 following feedback from the previous sprint review. 
MET-A-030 was introduced as additional functionality to support the maintenance and administration of the system.

## What we are demonstrating

The review included an overview of the current operator and steward applications, followed by a live demonstration where Carsten from Metro Service could interact with both applications.

1. **Operator and steward workflow demo** Demonstration of scenario selection and activation, the operator's situational overview, and the steward's interaction with an active scenario.
 The purpose was to demonstrate how the different parts of the system now work together.
Karsten was guided through both operator and steward view to give feedback. 

3. **MET-A-006 – Offline reports.** Demonstration of how reports are stored locally when a steward loses connection and synchronised when connectivity returns.
 The implementation covers local queuing, recovery after reconnection, duplicate prevention and conflict handling.

5. **MET-A-019 – Scenario suggestions.** Demonstration of how an operator can describe an incident and receive a ranked list of suggested scenarios. The core functionality is implemented, but the comparison and evaluation acceptance criterion remains.

6. **MET-A-029 – Station chat.** Demonstration of communication between operators and stewards through station-specific conversations. The main flow is implemented, while some remaining functionality and acceptance criteria are still being finalised.

7. **MET-A-027 – Usability test plan.** Presentation of the proposed evaluation structure, including individual task-based testing, a possible field test or office simulation, and semistructured interviews. The actual test will take place on 25 November.

8. **MET-A-030 – Admin dashboard.** Presentation of the ongoing administration functionality, including account and scenario management. This is additional functionality we consider valuable for further development and maintenance, although it is not central to the usability evaluation.

MET-A-018 was also presented as work in progress. The notification approach has been documented, but the remaining implementation and testing were not presented as completed functionality.

## What we learned

**Scenario suggestions and the underlying data**

MET-A-019 highlighted a limitation in the information available in our scenarios. The current suggestion method primarily identifies locations and tracks rather than the type of incident described. This means that improving the suggestion method is not necessarily only a matter of changing the algorithm, but may also require reconsidering what information is stored about scenarios.

We also identified limitations involving alternative station names, station codes and descriptions containing little contextual information. These limitations need to be documented and considered in the final evaluation.

**Communication between operators and stewards**

Feedback from Metro Service has influenced how we approach communication in the system. Rather than implementing separate instructions and acknowledgements, we replaced MET-A-016 and MET-A-017 with MET-A-029, which provides communication through station-specific chats.

This better reflects the need for less urgent information to be communicated without unnecessarily using the radio.

**Usability and operational context**

The upcoming usability evaluation should focus on realistic tasks and functionality that is sufficiently stable to test. We discussed the importance of not introducing last-minute changes that could interfere with the test or shift our attention away from what we actually want to evaluate.

The evaluation should help us understand how users interact with the system and where the workflows differ from their existing procedures.

**Administration and future development**

The administration functionality in MET-A-030 may also simplify future scenario management. Allowing authorised users to create and manage scenarios means that future scenario data can be entered through the system instead of relying entirely on manually importing predefined data.

This is useful beyond the immediate MVP and provides a foundation for further development.

## Questions for Metro Service

| Item | Question | Why it blocks us |
|---|---|---|
| MET-A-018 | Are notifications useful when scenarios start or end, or when a station receives a new message? Are there other events that would be more relevant? | Helps determine which notifications should be prioritised and validated |
| MET-A-019 | How do operators normally identify a scenario, and how does this differ between M1/M2 and M3/M4? | Affects whether the current suggestion method reflects how operators work |
| MET-A-019 | Would selecting a location on the map be more useful than describing an incident in text? | Could influence future interaction design and evaluation of the current approach |
| MET-A-029 | Should station communication work in both directions between stewards and operators? | Confirms the intended communication flow |
| MET-A-027 | Should the usability test include a field test in the metro or a simulation at the Metro Service office? | Determines the practical structure of the evaluation within the available two hours |
| MET-A-030 | Should users only have access to information for their assigned lines, or are there situations where they need access across multiple lines? | Affects role permissions and the administration design |

## What we intend next sprint

Sprint 6 will focus on completing and reviewing the remaining PBIs, carrying out the usability evaluation at Metro Service on 25 November, and analysing the findings. We will prioritise functionality needed for the evaluation and use the remaining time to finalise documentation, resolve outstanding acceptance criteria and prepare the system for handover.

Additional functionality will be evaluated against the remaining time and its importance to the final product.

## Decisions taken in this meeting

| Question | Answer | Who said it |
|---|---|---|
| Can the usability evaluation be recorded? | Audio recording of participants' statements is permitted, Karsten will make sure the stewards we test are okay with it. Individual participant consent must still be obtained. | Metro Service – individual not recorded |
| How should we approach the usability test? | Focus on the functionality that is ready and avoid making last-minute changes that could interfere with the evaluation. | Discussed during the meeting |
| How should the remaining work be prioritised? | The focus should be on completing existing functionality and resolving outstanding requirements rather than introducing unnecessary additions. | Joint planning discussion |

Other questions regarding specific PBIs and their remaining scope are carried into Sprint 6 planning rather than recorded as final decisions.
