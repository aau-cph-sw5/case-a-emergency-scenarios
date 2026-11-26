# Usability test findings

Related issue: MET-A-027

## Purpose

This document contains the defects, usability problems and improvement suggestions identified during the usability test.

We distinguish between problems with existing functionality and suggestions for functionality that is currently missing or outside our scope.

Additional participant feedback can be found in:

- [Steward feedback](steward-feedback.md)
- [Operator feedback](operator-feedback.md)

The findings are based on the available interviews, test observations and notes from the test team.

An observed defect concerns functionality that behaved incorrectly. A usability problem concerns difficulty finding, understanding or using existing functionality. Reported concerns and improvement suggestions are not automatically confirmed defects. The classifications and severities are preliminary.

## Severity

We use the following severity levels when categorising defects and usability problems.

| Severity | Description |
| --- | --- |
| Critical | May lead to the user misunderstanding an important station or task assignment. |
| High | Prevents or significantly delays an important action. |
| Medium | Causes confusion or an error that the user can recover from. |
| Low | Minor issue that does not significantly affect task completion. |

The severity levels below are our initial assessment and can be changed during backlog refinement.

## Findings overview

### Defects and usability problems

| ID | Finding | Severity | Source | GitHub issue |
| --- | --- | --- | --- | --- |
| D-01 | Multiple stewards can reserve or check in to a station beyond its required staffing. | High | S1, S3; O1 confirmed the expected behaviour | Pending |
| D-02 | Station coverage colour and status are confusing when excess staffing occurs. | High | S3 | Pending |
| D-03 | Chat is difficult to find and incoming messages may be overlooked. | Medium | S2, S3 | Pending |
| D-04 | Active scenario and relevant stations are not sufficiently visible. | Medium | S1, S2 | Pending |
| D-05 | Confirmation buttons do not clearly describe what is being confirmed. | Medium | S3 | Pending |
| D-06 | Staffing numbers are not sufficiently readable. | Medium | S3 | Pending |
| D-07 | Important scenario notifications may be missed during normal work. | High, requires further verification | S1, S3 | Pending |
| D-08 | Operator map does not show the yellow en-route status. | High | O1, task 3 | Pending |
| D-09 | Dedicated scenario switch workflow was not used. | Medium | O1, task 6 | Pending |
| D-10 | Station chats are not logically ordered. | Medium | O1, after-interview question 2 | Pending |
| D-11 | Message sender assignment is unclear. | Medium | O1, supplementary after-interview question G | Pending |
| D-12 | Following several station chats requires navigation. | Medium | O1, supplementary after-interview H and I; after-interview question 1 | Pending |
| D-13 | Staffing indicators on the operator map are too small. | Medium | O1, task 4 | Pending |

#### D-08 – Operator map does not show the yellow en-route status

Classification: Observed defect.

#### What happened

O1 identified a steward on the way but pointed out that the map did not show the yellow status.

#### Expected behaviour and follow-up

The map and staffing overview should represent the same reported staffing state. Reproduce with a steward en route and compare both views. Investigate together with D-02; the underlying cause is not yet known.

#### Source

Operator test notes: O1, task 3.

#### Suggested issue title

Correct en-route status on the operator map

### D-09 – Dedicated scenario switch workflow was not used

Classification: Observed usability problem.

#### What happened

O1 stopped the active scenario and started another rather than using the switch button.

#### Expected behaviour and follow-up

Investigate whether the switch action is sufficiently visible and understandable. This observation does not establish that the switch is technically broken.

#### Source

Operator test notes: O1, task 6.

#### Suggested issue title

Investigate scenario switch discoverability

### D-10 – Station chats are not logically ordered

Classification: Reported usability problem.

#### What happened

O1 spent time finding the station chat and explained that the order was not logical to him.

#### Expected behaviour and follow-up

Use an ordering that makes relevant station chats easier to locate. Clarify the preferred ordering with Metro.

#### Source

Operator test notes: O1, after-interview question 2.

#### Suggested issue title

Improve station chat ordering

### D-11 – Message sender assignment is unclear

Classification: Reported usability problem.

#### What happened

O1 found it confusing that employees working on trains could write in the same station chat as employees at the station.

#### Expected behaviour and follow-up

Make the sender and relevant assignment distinguishable without exposing unnecessary personal information.

#### Source

Operator test notes: O1, supplementary after-interview question G.

#### Suggested issue title

Clarify sender assignment in operator chat

### D-12 – Following several station chats requires navigation

Classification: Workflow limitation.

#### What happened

O1 wanted to follow communication from several stations without opening each chat individually.

#### Expected behaviour and follow-up

Reduce navigation during active scenarios; consider the dashboard proposal in I-10 and I-11.

#### Source

Operator test notes: O1, supplementary after-interview H and I; after-interview question 1.

#### Suggested issue title

Improve access to relevant station conversations

### D-13 – Staffing indicators on the operator map are too small

Classification: Reported usability problem.

#### What happened

O1 suggested larger staffing indicators on the map.

#### Expected behaviour and follow-up

Ensure staffing indicators are readable on the intended operator displays. Evaluate alongside the proposed compact map.

#### Source

Operator test notes: O1, task 4.

#### Suggested issue title

Improve operator map staffing readability

## Improvement suggestions

| ID | Suggested improvement | Source |
| --- | --- | --- |
| I-01 | Introduce distinct alarms when a scenario starts and ends. | S1, S3, test team notes |
| I-02 | Associate steward accounts with their working zones. | Test team suggestion based on steward workflow |
| I-03 | Only show stations requiring staffing in the main assignment view. | Test team suggestion based on coverage observations |
| I-04 | Provide speech-to-text through a microphone in the chat. | S1, test team notes |
| I-05 | Add a confirmation sound when checking in and potentially when checking out. | S1 |
| I-06 | Provide more precise task descriptions before the steward arrives. | S1, test team notes |
| I-07 | Support additional staffing when required by the operator. | S2 |
| I-08 | Provide expected arrival information. | S2 |
| I-09 | Distinguish between scenario activation and established scenario operation. | S3 |
| I-10 | Active-scenario dashboard layout. | O1: OP-01–OP-03 |
| I-11 | Simultaneous station chats and task progress. | O1: OP-04, OP-05 |
| I-12 | One-way broadcast communication. | O1: OP-18, OP-19 |
| I-13 | Operator-controlled steward redirection. | O1: OP-13 |
| I-14 | Communication with en-route stewards. | O1: OP-14 |
| I-15 | Train counts and DID information. | O1: OP-26–OP-28 |
| I-16 | Order stations by operational relevance. | O1: OP-06, OP-21 |
| I-17 | Operator dashboard clock. | O1: OP-09 |
| I-18 | Configurable dashboard components. | O1: OP-02, OP-08 |
| I-19 | Structured scenario suggestion inputs. | O1: OP-30, OP-31 |
| I-20 | Individual steward task completion. | O1: OP-05, OP-29 |

The improvements have not been assigned severity levels, as they do not necessarily represent defects in the current implementation.

## Defects and usability problems

### D-01 – Duplicate station reservations and check-ins

#### What happened

During the test, multiple stewards were able to select the same station even though the number of required stewards had already been reserved.

This resulted in a station having more stewards assigned than required.

The stewards then had to figure out who should stay assigned to the station.

O1 independently confirmed in the after-interview that only one steward should be able to take an assignment requiring one steward. This is confirmation of the expected behaviour, not a separate observed occurrence.

#### Why it is a problem

One of the main purposes of our system is to help stewards coordinate station coverage.

If a station requires one steward, two stewards should not unintentionally be able to reserve or check in against the same assignment.

This also needs to be taken into consideration when a steward registers that they are on their way.

If the system only counts stewards who have already arrived, several stewards may travel to the same station without knowing that someone else has already taken responsibility for it.

This could result in another station remaining without coverage.

#### Expected behaviour

The system should prevent unintended duplicate reservations and check-ins when the configured staffing requirement has already been fulfilled or reserved.

For a station requiring one steward, only one steward should be able to take the available assignment through the normal workflow.

A reserved staffing position is not the same as actual coverage. A steward on the way reserves a position but is not yet counted as arrived.

The system should take into account both:

- Stewards who are on their way.
- Stewards who have arrived.

If multiple stewards attempt to select the last available assignment at approximately the same time, the system should handle the requests consistently.

The steward who cannot reserve the station should receive clear feedback and be able to choose another station.

S2 mentioned that additional staffing may sometimes be necessary. We should therefore clarify whether the operator needs a separate way to increase the staffing requirement.

#### Suggested reproduction

1. Activate a scenario with a station requiring one steward.
2. Select the station from one steward device.
3. Register that the steward is en route.
4. Attempt to select the same station from another device.
5. Attempt to check in from both devices.
6. Check the coverage information on the steward and operator sides.

We should also test what happens when two stewards select the same station at approximately the same time.

#### Source

- S1 Forsøg 1, 05:51–09:44.
- S3 Nørreport, 08:18–10:59.
- S2 interview feedback regarding additional staffing.
- O1 after-interview, questions 4 and 6.

#### Suggested issue title

Prevent duplicate station reservations and check-ins

### D-02 – Confusing station coverage status

#### What happened

During the coverage task, S3 was confused by a station still being displayed in red after checking in.

The participant expected the colour to indicate that the station was covered.

The issue occurred in a situation involving multiple stewards assigned to the same station.

#### Why it is a problem

The steward and operator need to be able to quickly understand whether a station requires additional coverage.

If the displayed colour does not match what the user expects, they may be uncertain whether their check-in has been registered correctly.

This may also affect whether another steward decides to travel to the same station.

#### Expected behaviour

The coverage information should clearly distinguish between:

- Stations that still require staffing.
- Stations where stewards are already on their way.
- Stations with sufficient arrived stewards.
- Stations with more stewards than required, where additional staffing is allowed.

The numbers, colours and other status information should communicate the same state.

#### Suggested reproduction

1. Activate a scenario requiring station coverage.
2. Assign multiple stewards to the same station.
3. Confirm arrival.
4. Check the station colour and staffing numbers.
5. Compare the displayed coverage with the actual reported statuses.

The technical cause needs to be investigated before we can determine whether this is part of D-01 or a separate coverage calculation or presentation issue.

#### Source

- S3 Nørreport, 06:25–10:59.
- S3 timing notes: coverage task took more than 20 seconds.

#### Suggested issue title

Correct and clarify station coverage states

### D-03 – Chat discoverability

#### What happened

S2 mentioned that the chat functionality was difficult to find in the application.

S3 also did not initially notice that a message had been received.

#### Why it is a problem

If the steward needs to spend time finding the chat, they may prefer to use the radio instead.

They may also miss relevant written information from the control room.

#### Expected behaviour

The chat should be easy to locate from the main steward interface.

It should also be clear when there are unread messages.

#### Suggested reproduction

1. Open the steward application with an active scenario.
2. Ask a user who is unfamiliar with the interface to find the chat without giving them a hint.
3. Send a message to the user.
4. Observe whether they notice the incoming message.

#### Source

- S2 after-interview.
- S3 Nørreport, 18:43–19:04.

#### Suggested issue title

Improve chat discoverability and unread message visibility

### D-04 – Visibility of scenario and station information

#### What happened

S1 mentioned that it should be clearer which station is relevant to the steward.

S2 commented that the active scenario number was not visible enough and needed help finding the separate list of affected stations.

#### Why it is a problem

The steward should be able to identify relevant information without spending unnecessary time navigating the application.

Displaying information that does not require any action from the steward may also make the relevant information harder to find.

This is directly related to the purpose of MET-A-027.

#### Expected behaviour

- Relevant stations should be easy to identify.
- The active scenario number should be clearly visible.
- Stations requiring staffing should be easy to find.
- The wider scenario information should remain accessible when needed.

Filtering stations based on their staffing requirements and the steward's working zone could be considered as potential improvements.

These suggestions are described separately in I-02 and I-03.

#### Source

- S1 after-interview, 19:47–20:35.
- S2 usability tests.
- S2 after-interview.

#### Suggested issue title

Improve visibility of relevant stations and active scenario

### D-05 – Unclear confirmation buttons

#### What happened

S3 commented on the wording of the confirmation button and what the user was actually confirming.

#### Why it is a problem

The user should understand what an action does before performing it.

A generic confirmation button may require the steward to spend additional time reading the surrounding information to determine what will happen.

#### Expected behaviour

The text on confirmation buttons should describe the action being performed.

For example, confirming arrival should be distinguishable from confirming departure or another status change.

The application should also provide clear feedback once the action has been registered.

A confirmation sound could provide additional feedback and is described separately in I-05.

#### Source

- S3 Nørreport, 05:46–06:07.

#### Suggested issue title

Use action-specific labels for status confirmation

### D-06 – Staffing number readability

#### What happened

S3 commented on the size of the staffing numbers displayed in the application.

#### Why it is a problem

The application is intended to be used on a relatively small screen while the steward is working and moving around the Metro.

Staffing information is one of the main pieces of information needed to decide whether a station requires coverage.

It should not require unnecessary effort to read or interpret.

#### Expected behaviour

Staffing numbers should be readable on the target device and clearly associated with the relevant station.

The information should remain understandable without relying solely on colour.

#### Source

- S3 Nørreport, 12:53.

#### Suggested issue title

Improve readability of station staffing numbers

### D-07 – Notification visibility

#### What happened

S1 and S3 raised concerns about noticing new scenarios or changes when their phones are in their pockets.

S3 also missed an incoming chat message during the test.

#### Why it is a problem

During normal work, stewards may not have their phones available or may be occupied with other tasks.

If they do not notice important updates, they may continue working without knowing that a scenario has started, changed or ended.

This could make the application difficult to rely on during an actual fallback scenario.

#### Expected behaviour

Important scenario events should be noticeable without the steward having to constantly monitor the screen.

The behaviour should be evaluated when the phone is:

- Locked.
- In a pocket.
- Being used for another application.
- On silent, where relevant to Metro's device policies.

The notification behaviour should distinguish between important scenario events and ordinary messages.

#### Follow-up

Check MET-A-018, the existing notification PBI and the version of the implementation used during the usability test.

Some of the requested functionality may already be planned or under development.

We should not register a regression without first checking what was implemented in the tested build.

The specific suggestion of having distinct alarms when a scenario starts and ends is described in I-01.

#### Source

- S1 after-interview, 03:35–08:55 and 15:08–17:08.
- S3 Nørreport, 02:39–04:26 and 18:43–19:04.

#### Suggested issue title

Improve notification visibility during steward work

## Improvement suggestions

### I-01 – Distinct alarms for scenario start and end

#### Background

The stewards explained that they do not always have their phones available during work.

During a scenario, they may be occupied with passengers or other operational tasks rather than using their phones.

We therefore discussed having a distinct alarm when a scenario starts and ends.

#### Suggested functionality

- Play a noticeable alarm when a scenario is activated.
- Play a distinguishable alarm when the scenario ends.
- Provide clear notifications when an existing assignment is changed or cancelled.
- Distinguish important scenario events from ordinary chat messages.

The behaviour should be tested on the devices used by Metro.

We also need to clarify whether the alarms should continue until acknowledged and how they should behave when the phone is on silent.

The existing radio communication procedures should remain in place.

#### Suggested issue title

Introduce distinct alarms for scenario activation and termination

#### Related

D-07, SW-01, SW-02, SW-03 and SW-06.

### I-02 – Zone-based steward accounts and station selection

#### Background

The interviews gave us a better understanding of how stewards are distributed across the Metro.

Stewards already work within different geographical areas or zones.

At the moment, the application does not necessarily take the individual steward's normal working area into consideration when presenting station assignments.

#### Suggested functionality

Associate steward accounts with the zone or zones they work in.

When a scenario is activated, the application could use this information to show or prioritise the nearest relevant stations that still require staffing.

For example, if a scenario affects several stations across the network, the steward would primarily be presented with stations requiring coverage within their own working area.

This would reduce the amount of information they need to go through before choosing a station.

The full scenario information could still be available separately.

#### Points to clarify

- How the existing working zones are defined.
- Whether zones are associated with employees or shifts.
- Whether stewards can belong to multiple zones.
- Who is responsible for assigning and updating zones.
- Whether zone configuration should be part of the account administration functionality.
- How the system determines which station is nearest.
- Whether current position information is available and appropriate to use.
- How stewards can assist outside their usual working zone.
- What happens when no stations within the steward's zone require staffing.

This should be discussed with Metro before implementation, as it affects both the account model and the station assignment workflow.

#### Suggested issue title

Support zone-based station selection for steward accounts

#### Related

D-04, SW-07, SW-14, SW-15 and SW-22.

### I-03 – Filter station selection by staffing requirements

#### Background

The main purpose of the steward's station selection view is to help them determine where their help is needed.

Not all stations affected by a scenario necessarily require staffing.

Displaying stations that do not require any action may make it more difficult to identify the relevant ones.

#### Suggested functionality

Only show stations that still require staffing as available assignments in the main station selection view.

A station should not appear as an available assignment if the required number of stewards is already on their way or has arrived.

If the staffing requirement increases or a steward checks out, the station should become available again when appropriate.

The steward's current assignment should remain visible regardless of whether the station still requires additional staffing.

A broader scenario overview can remain available separately for situations where the steward needs information about other affected stations.

This could be combined with the proposed zone-based station selection.

The operator should retain access to the complete overview, including already covered stations.

#### Suggested issue title

Filter available steward assignments by remaining staffing requirements

#### Related

D-01, D-04, I-02, SW-07, SW-10, SW-15 and SW-16.

### I-04 – Speech-to-text in the chat

#### Background

Dyslexia was brought up by S1 during the test.

Some employees already use the microphone on their phones to dictate messages rather than typing them manually.

We had not taken this into consideration when initially developing the chat functionality.

#### Suggested functionality

Allow stewards to use a microphone to dictate messages in the chat.

The dictated message should be converted to text and remain editable before being sent.

This would make it possible for employees who have difficulties writing to use the chat without relying on manual typing.

It could also be useful when a steward needs to write a message while occupied with other work.

We should first investigate whether the existing Android keyboard functionality is available and sufficient on Metro's devices.

If it is, we may not need to implement a separate speech recognition solution.

Any additional speech recognition functionality must also comply with Metro's requirements for data handling.

#### Suggested issue title

Support accessible message composition through speech-to-text

#### Related

SW-28 and SW-41.

### I-05 – Confirmation sound for check-in and checkout

#### Background

S1 suggested having a sound when checking in as additional confirmation that the action has been registered.

The steward may be occupied with other work and may not have time to inspect the screen after performing the action.

#### Suggested functionality

Play a short confirmation sound after a successful check-in.

A separate sound could be used for checkout so the steward can distinguish the two actions.

The sound should only be played once the status change has been successfully confirmed by the system.

It should not indicate success if the action has failed or has not yet been synchronised.

Visual confirmation should remain available.

#### Suggested issue title

Add audible confirmation for steward status changes

#### Related

D-05, SW-04 and SW-39.

### I-06 – More precise task information before arrival

#### Background

S1 mentioned that it would be useful to know more precisely what they need to do before arriving at the assigned station.

This would allow the steward to prepare while travelling.

Depending on the task, this could involve putting on a safety vest, finding tools or bringing specific equipment.

#### Suggested functionality

Make the task description available when the steward selects a station or registers that they are on their way.

The description should contain the information relevant to the specific assignment, including:

- What the steward needs to do.
- Any preparations needed before arrival.
- Relevant equipment or tools.
- Additional instructions specific to the situation.

The task information should remain accessible throughout the assignment.

We should distinguish between general procedures that experienced stewards already know and information that is specific to the current scenario.

It also needs to be clarified whether these descriptions should be stored as part of the predefined scenario or be adjustable by the operator.

#### Suggested issue title

Provide assignment details and preparation instructions before arrival

#### Related

SW-33, SW-34, SW-38 and OP-T05.

### I-07 – Flexible staffing requirements

#### Background

S2 explained that additional stewards may sometimes be needed at a station due to passenger numbers or other operational circumstances.

This is relevant to the duplicate station reservation defect.

#### Suggested functionality

Prevent unintended duplicate assignments through the normal station selection workflow.

Where additional staffing is needed, the operator could potentially increase the staffing requirement for the relevant station.

This would make the additional assignment available to other stewards without allowing uncontrolled overbooking.

The actual workflow needs to be clarified with Metro.

#### Suggested issue title

Support controlled adjustments to station staffing requirements

#### Related

D-01, SW-17 and OP-S06.

### I-08 – Expected arrival information

#### Background

S2 mentioned that knowing someone is on their way does not necessarily tell the control room when that person will arrive.

#### Suggested functionality

Investigate whether the application could provide an expected arrival time or another indication of the steward's progress towards the station.

This could help the operator determine whether further coordination is necessary.

We need to clarify how this information should be obtained and whether it is sufficiently reliable to be useful.

#### Suggested issue title

Provide expected steward arrival information

#### Related

SW-18 and OP-S03.

### I-09 – Scenario operational readiness

#### Background

S3 pointed out that a scenario being activated does not necessarily mean that the Metro is already operating according to that scenario.

There may be a preparation period where the control room and stewards are establishing the new operational setup.

#### Suggested functionality

Consider distinguishing between:

- A scenario being activated.
- The operational setup being prepared.
- The scenario operation being established.
- The scenario being ended.

This could give the stewards better information about the current state of the situation.

The exact states and their meaning would need to be clarified with Metro.

#### Suggested issue title

Distinguish scenario activation from operational readiness

#### Related

SW-35 and OP-S16.

### I-10 – Active-scenario dashboard layout

Adapt the dashboard after activation so the affected area, staffing, messages and task progress are prioritised. Keep the map accessible when needed.

Related feedback: OP-01–OP-03 in [operator-feedback.md](operator-feedback.md).

### I-11 – Simultaneous station chats and task progress

Display relevant station conversations and task progress directly on the dashboard so the operator does not need to open each station separately.

Related feedback: OP-04, OP-05 in [operator-feedback.md](operator-feedback.md).

### I-12 – One-way broadcast communication

Allow the operator to send one announcement to relevant stewards without creating a group reply thread. Clarify recipient scope, including employees not yet assigned.

Related feedback: OP-18, OP-19 in [operator-feedback.md](operator-feedback.md).

### I-13 – Operator-controlled steward redirection

Allow the operator to redirect an en-route steward when needed. Clarify acknowledgement, availability, release of the previous reservation and updates on both clients. Drag-and-drop is a design proposal.

Related feedback: OP-13 in [operator-feedback.md](operator-feedback.md).

### I-14 – Communication with en-route stewards

Allow relevant communication before arrival; clarify how recipients are identified and how this relates to station chat.

Related feedback: OP-14 in [operator-feedback.md](operator-feedback.md).

### I-15 – Train counts and DID information

Display the planned number of trains per Destination ID and the total required for the selected scenario, focusing on the affected area.

Related feedback: OP-26–OP-28 in [operator-feedback.md](operator-feedback.md).

### I-16 – Order stations by operational relevance

Order staffing entries and station chats in a way that reflects operational relevance. Clarify the ordering with Metro.

Related feedback: OP-06, OP-21 in [operator-feedback.md](operator-feedback.md).

### I-17 – Operator dashboard clock

Include a visible clock on the dashboard.

Related feedback: OP-09 in [operator-feedback.md](operator-feedback.md).

### I-18 – Configurable dashboard components

Consider allowing the operator to rearrange, minimise or expand dashboard components without losing access to relevant information.

Related feedback: OP-02, OP-08 in [operator-feedback.md](operator-feedback.md).

### I-19 – Structured scenario suggestion inputs

Investigate structured alternatives to free text in MET-A-019. O1 found the feature less relevant to M1/M2 but suggested possible value for M3/M4. Recommendation accuracy was not evaluated.

Related feedback: OP-30, OP-31 in [operator-feedback.md](operator-feedback.md).

### I-20 – Individual steward task completion

Allow stewards to mark individual tasks as completed and the operator to follow progress. Discuss whether this changes the refined scope of MET-A-021 or requires a separate PBI.

Related feedback: OP-05, OP-29 in [operator-feedback.md](operator-feedback.md).

## Backlog follow-up

The defects and improvement suggestions should be compared with existing backlog items before creating new issues.

For MET-A-027, at least two defects identified during the usability test need to be registered in the backlog.

D-01, D-02 and D-08 should be investigated together as they may be related. D-01 and D-08 are candidates for separate defect reports if reproduction confirms independent defects.

If they share a root cause, investigate another independently reproducible defect. D-03 is a separate usability problem; agree whether it qualifies for the acceptance criterion before counting it as a defect.

Once the issues have been created, add their issue numbers to the findings overview at the top of this document.

The improvement suggestions should be discussed separately so they do not automatically become part of the current sprint or semester scope.

## Suggested priority

We should first address issues that affect the existing core workflow before adding functionality outside our current scope.

In particular:

1. Prevent duplicate station reservations and check-ins.
2. Correct misleading station coverage information.
3. Improve the visibility of important scenario events.
4. Make it easier to identify stations requiring staffing.
5. Provide relevant task information before arrival.
6. Improve status confirmation.
7. Improve chat discoverability and accessibility.

The proposed zone-based account configuration and assignment filtering are worth discussing with the Product Owner, as they could improve how the existing station selection workflow functions.

However, these changes may also affect the account model, administrative functionality and staffing logic.

They should therefore be refined with Metro before we decide how they should be implemented.
