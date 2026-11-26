# Operator feedback

Related issue: MET-A-027 (#26)
Test date: 25 November 2026
Participant: O1 (M1/M2)

This document contains the operator's feedback, paraphrased from
the Danish notes and interviews.

Task observations and timings are in
[raw-observations.md](../raw-observations.md).

The analysis and proposed backlog changes are in
[evaluation.md](../evaluation.md) and [findings.md](../findings.md).

## Current workflow

The operator considers radio communication effective for immediate
operational information. However, simultaneous status reports
compete for access to the channel, and coverage or missed
announcements can interrupt communication.

He sees value in supplementary digital reporting, provided it
does not require him to spend more time writing individual messages.

Predefined fallback scenarios already help both roles understand
the operational plan.

The operator may begin coordinating staffing before activation,
and establishing the actual scenario operation takes further
preparation.

Employee availability varies with shifts, working areas and other
responsibilities. The operator cannot assume that a steward is
physically located in their expected working area.

Sources:

- Ny optagelse 3.html, 00:00–05:14.
- Ny optagelse 4.html, 00:47–09:00, 11:43–14:15 and 15:33–17:50.
- Operator before-interview notes, pp. 1–3.

## Direct operator feedback

### Dashboard layout and information hierarchy

| ID | Feedback |
| --- | --- |
| OP-01 | Change the dashboard layout depending on whether a scenario is being selected or is already active. |
| OP-02 | Reduce or minimise the map during an active scenario, with the option to expand it again. |
| OP-03 | Focus the overview on the affected area rather than displaying the entire network. |
| OP-04 | Display the chats from the relevant stations simultaneously. |
| OP-05 | Display steward task progress directly on the dashboard. |
| OP-06 | Order stations according to their relevance or priority within the scenario. |
| OP-07 | Reduce the need to scroll through the staffing overview. |
| OP-08 | Consider allowing the operator to rearrange dashboard components according to their preferences. |
| OP-09 | Include a clock on the dashboard. |
| OP-10 | Increase the size of the staffing indicators on the map. |

Sources:

- Operator usability test, tasks 3 and 4.
- Operator after-interview, supplementary questions G and H.
- Operator after-interview, questions 1, 4 and 6.

### Staffing and coordination

| ID | Feedback |
| --- | --- |
| OP-11 | Prevent multiple stewards from taking the same assignment when only one steward is required. |
| OP-12 | Encourage stewards to select another station when the required number of stewards is already on their way. |
| OP-13 | Allow the operator to redirect a steward who is on their way to a station. |
| OP-14 | Allow communication with stewards before they arrive at their selected station. |
| OP-15 | Make the staffing status consistent between the map and the staffing overview, including the yellow en-route status. |
| OP-16 | Make it possible to see which stations are staffed while using the chat. |
| OP-17 | Allow stewards to report their status independently and simultaneously without waiting for access to the radio. |

Sources:

- Operator before-interview.
- Operator usability test, task 3.
- Operator after-interview, supplementary question I.
- Operator after-interview, questions 4, 5 and 6.
- Ny optagelse 4.html, 07:40–09:00.

### Chat and communication

| ID | Feedback |
| --- | --- |
| OP-18 | Be able to send a message to all relevant stewards at the same time. |
| OP-19 | Provide a one-way broadcast function where stewards cannot reply directly to the announcement. |
| OP-20 | Make it clear who sent a message and whether they are assigned to a station or a train. |
| OP-21 | Arrange station chats in a logical order. |
| OP-22 | Reduce the number of interactions required to find and open the relevant chat. |
| OP-23 | Use chat primarily for communication that does not require an immediate response. |
| OP-24 | Keep the radio as the primary tool for immediate operational communication. |
| OP-25 | Provide an alternative way for stewards to communicate when they cannot get through on the radio. |

Sources:

- Operator before-interview.
- Operator usability test, task 4.
- Operator after-interview, supplementary questions G, H and I.
- Operator after-interview, questions 1, 2, 4 and 5.
- Ny optagelse 3.html, 00:14–03:48.

### Scenario and operational information

| ID | Feedback |
| --- | --- |
| OP-26 | Display how many trains should operate under each Destination ID (DID). |
| OP-27 | Display the total number of trains required by the fallback scenario. |
| OP-28 | Prioritise DID information for the affected area. |
| OP-29 | Allow the operator to follow the completion of individual steward tasks. |
| OP-30 | Consider structured scenario suggestion inputs instead of relying on free text. |
| OP-31 | Consider whether scenario suggestions are more relevant to M3/M4 than M1/M2. |

Sources:

- Operator after-interview, questions 4, 5 and 6.
- Ny optagelse 4.html, 03:23–04:42.
- Ny optagelse 4.html, 07:40–09:00.

### Scenario suggestions (MET-A-019)

O1 did not find the free-text input particularly relevant to
his M1/M2 workflow because the control room already discusses
the scenario before activation.

He suggested structured inputs and thought the feature might be
more useful on M3/M4, where there are more scenarios.

This is feedback on relevance and input design, not model accuracy.

Source: Operator after-interview, question 5.

## Design proposals

### Active-scenario dashboard

The map is useful when selecting a scenario, but O1 would prefer
to use the space for relevant station chats, task progress and
staffing once a scenario is active.

He already has geographical information on other screens.

The proposed layout retains access to the map and adds a shared
broadcast field.

![Proposed active-scenario dashboard](operators%20feedback%20til%20dashboard%20layout%20under%20aktivt%20scenarie.png)

Related: OP-01–OP-10, OP-18, OP-19, OP-29; I-10–I-12.

### Steward redirection

O1 wants to be able to redirect a steward who is on their way.

The supplied proposal illustrates a possible interaction using
the staffing overview.

The assignment, notification and reservation changes require
further refinement (I-13).

![Proposed steward redirection](operators%20ide%20til%20en%20omdirigerings%20feature.gif)

Both images are design proposals, not validated implementations.
Confirm that the displayed data is approved for repository use.

## Positive feedback and stated priorities

O1 liked the general structure, visual design, intuitive navigation
and timestamps.

He saw particular value in independent status and task reporting,
as it could reduce the need for radio calls.

When asked what he would change first, he focused on the affected
stations, relevant DIDs and train counts, preventing duplicate
assignments, visible station chats and task progress, and reducing
the map size and scrolling during an active scenario.

Broadcasts and redirection were also strong requests.

Source: Operator after-interview, supplementary questions F–I
and questions 4–6.

## Observed usability problems

See [findings](../findings.md) for the corresponding descriptions
and follow-up.

Previous observation IDs are retained here for traceability:

| Observation | Finding |
| --- | --- |
| OP-D01 | D-08 |
| OP-D02 | D-09 |
| OP-D03 | D-10 |
| OP-D04 | D-11 |
| OP-D05 | D-12 |
| OP-D06 | D-13 |
| OP-D07 | D-01 (confirmed expected behaviour, not a separate observed occurrence) |

## Related steward and team feedback

The steward perspective is recorded in
[steward-feedback.md](../steward-feedback.md).

The following IDs are retained for existing references; detailed
proposals and questions for refinement are maintained in
[findings.md](../findings.md).

### Staffing overview and coordination

| ID | Feedback | Participant |
| --- | --- | --- |
| OP-S01 | See which stations are covered and which still require stewards. | S1, S2, S3 |
| OP-S02 | See which stewards are on their way. | S1, S2, S3 |
| OP-S03 | Have an indication of when stewards are expected to arrive. | S2 |
| OP-S04 | See when the staffing requirements for the scenario have been fulfilled. | S2 |
| OP-S05 | Assign or highlight a relevant station for a specific steward. | S1, S2 |
| OP-S06 | Request additional staffing when the situation requires it. | S2 |
| OP-S07 | Have consistent staffing information so multiple stewards do not unintentionally take responsibility for the same station. | S1, S3 test observations |

### Communication

| ID | Feedback | Participant |
| --- | --- | --- |
| OP-S08 | Communicate directly with the relevant steward. | S1, test discussion |
| OP-S09 | Handle non-urgent written messages without occupying the radio. | S1, S3 |
| OP-S10 | Share relevant information across work areas and radio channels. | S2 |
| OP-S11 | Support communication involving PIO. | S1 |
| OP-S12 | Keep relevant messages available for later reference. | S1, S3 |

### Scenario information and updates

| ID | Feedback | Participant |
| --- | --- | --- |
| OP-S13 | Communicate the reason a scenario has been activated. | S1, S3 |
| OP-S14 | Provide more precise task information before the steward arrives, including relevant preparations. | S1 |
| OP-S15 | Clearly communicate changes and cancellations. | S1 |
| OP-S16 | Indicate when scenario operation has been established. | S3 |
| OP-S17 | Distribute relevant general operational information, such as travel guarantee. | S2 |

### Team suggestions

| Team ID | Topic | Related finding |
| --- | --- | --- |
| OP-T01 | Working zones | I-02 |
| OP-T02 | Assignment filtering | I-03 |
| OP-T03 | Duplicate assignments | D-01, D-02, D-08 |
| OP-T04 | Scenario alarms | I-01 |
| OP-T05 | Task information and progress | I-06, I-20 |
| OP-T06 | Accessible chat | I-04 |

## Source material

- `usability_test_operator 25-11.docx`, pp. 1–7
  (before-interview, test observations and after-interview).
- `Ny optagelse 3.html` and `Ny optagelse 4.html`
  (before-interview transcripts; corresponding audio retained separately).
- The two design proposals included alongside this document.

See [raw observations](../raw-observations.md) for the measurement
limitations.

The operator sample consists of one M1/M2 operator; the proposed
changes have not been retested.