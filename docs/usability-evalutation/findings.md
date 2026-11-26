# Usability test findings

Related issue: MET-A-027 

This is the follow-up list for the usability test.

Participant requests and their sources are in
[steward feedback](steward-feedback.md) and
[operator feedback](operator/operator-feedback.md).

Task observations are in [raw observations](raw-observations.md).

Severity is provisional. Functional defects, usability problems
and reported concerns are distinguished below; proposed features
are not defects.

## Severity

We use the following severity levels when categorising defects
and usability problems.

| Severity | Description |
| --- | --- |
| Critical | May lead to the user misunderstanding an important station or task assignment. |
| High | Prevents or significantly delays an important action. |
| Medium | Causes confusion or an error that the user can recover from. |
| Low | Minor issue that does not significantly affect task completion. |

The severity levels below are our initial assessment and can be
changed during backlog refinement.

## Defects and usability problems

| ID | Finding | Classification / severity | Evidence | Expected behaviour or follow-up | Issue |
| --- | --- | --- | --- | --- | --- |
| D-01 | Duplicate station reservations and check-ins | Functional defect / High | S1, S3; O1 confirmed expected behaviour | Prevent reservations beyond required staffing. Count en-route and arrived separately: reserved is not covered. Validate concurrent selections on the server and give rejected users clear feedback. Allow deliberate extra staffing only through an agreed workflow (I-07). | Pending |
| D-02 | Confusing station coverage status | Observed problem / High | S3 | Coverage indicators and counts should agree and distinguish missing, en-route, arrived and excess staffing. Investigate whether D-01 causes this. | Pending |
| D-03 | Chat discoverability | Usability problem / Medium | S2, S3 | Make chat easy to find and unread messages noticeable. | Pending |
| D-04 | Scenario and station visibility | Usability problem / Medium | S1, S2 | Make the active scenario identifier and relevant staffing stations easier to find (I-02, I-03). | Pending |
| D-05 | Unclear confirmation buttons | Usability feedback / Medium | S3 | Use action-specific labels and clear feedback after registration (I-05). | Pending |
| D-06 | Staffing number readability | Usability feedback / Medium | S3 | Make counts readable and understandable without relying solely on colour. | Pending |
| D-07 | Notification visibility | Reported concern / High, verify | S1, S3 | Check the tested build and MET-A-018 before classifying as a defect. Evaluate locked, pocketed and silent phones under Metro device policies. | Pending |
| D-08 | Missing yellow en-route status on operator map | Observed defect / High | O1, task 3 | Make map status consistent with staffing overview. Investigate with D-02. | Pending |
| D-09 | Dedicated switch workflow not used | Observed usability problem / Medium | O1, task 6 | Investigate why O1 stopped and restarted instead of using Switch. This does not establish a technical failure. | Pending |
| D-10 | Station chat ordering | Usability problem / Medium | O1, after-interview Q2 | Order chats logically and by operational relevance (I-16). | Pending |
| D-11 | Unclear message sender assignment | Usability problem / Medium | O1, supplementary G | Distinguish station and train assignments and identify the sender appropriately. | Pending |
| D-12 | Navigation between station chats | Workflow limitation / Medium | O1, supplementary H/I; Q1 | Allow monitoring relevant chats without repeatedly opening individual views (I-11). | Pending |
| D-13 | Small operator map staffing indicators | Usability feedback / Medium | O1, task 4 | Improve readability on the intended dashboard. | Pending |

### Reproduction of the main functional findings

#### D-01 – Duplicate reservations

Activate a scenario with a station requiring one steward.

Register en route on one device, attempt the same reservation
and check-in on a second device, and compare both clients with
the operator dashboard.

Repeat with simultaneous selections.

Check offline queued reports against ADR 0013 and ADR 0015.
Server-side validation is a proposed approach.

#### D-02 / D-08 – Coverage status

Compare the map and staffing overview after en-route registration
and arrival.

Repeat with multiple stewards assigned to the same station.

Verify whether the two display problems share a cause.

#### D-03 – Chat discoverability

Ask a user unfamiliar with the interface to find chat without
hints, then send a message and observe whether it is noticed.

### Evidence references

- D-01: S1 Forsøg 1, 05:51–09:44; S3 Nørreport, 08:18–10:59;
  S2 interview feedback regarding additional staffing;
  O1 after-interview, questions 4 and 6.
- D-02: S3 Nørreport, 06:25–10:59; S3 timing notes: coverage
  task took more than 20 seconds.
- D-03: S2 after-interview; S3 Nørreport, 18:43–19:04.
- D-04: S1 after-interview, 19:47–20:35; S2 usability tests;
  S2 after-interview.
- D-05: S3 Nørreport, 05:46–06:07.
- D-06: S3 Nørreport, 12:53.
- D-07: S1 after-interview, 03:35–08:55 and 15:08–17:08;
  S3 Nørreport, 02:39–04:26 and 18:43–19:04.

Operator findings D-08–D-13 refer to the task and interview
question numbers in the table above.

## Improvement suggestions

| ID | Proposal | Feedback | Related PBI (provisional) | Details |
| --- | --- | --- | --- | --- |
| I-01 | Distinct scenario start and end alarms | SW-01–03, SW-06; TEAM-01 | MET-A-018 | Distinguish start/end and important changes from ordinary messages. Test locked/pocket/silent behaviour and clarify acknowledgement; retain radio procedures. |
| I-02 | Zone-based steward accounts | TEAM-02; OP-T01 | MET-A-030 (proposed) | Associate accounts or shifts with working zones and prioritise nearby stations needing staff. Clarify zone management, multiple zones, proximity, exceptions and cross-zone assistance. A zone is not a confirmed physical location. |
| I-03 | Filter available assignments | TEAM-03; OP-T02 | MET-A-013, MET-A-015 (proposed) | Show only stations with remaining staffing positions in the assignment view; retain current assignment and access to wider information. Reopen positions when appropriate; operator retains full relevant coverage. |
| I-04 | Speech-to-text in chat | SW-28, SW-41; TEAM-05 | MET-A-029 | Investigate existing Android keyboard dictation first. Provide an accessible microphone if needed, with editable text before sending and approved data handling. |
| I-05 | Audible status confirmation | SW-04; TEAM-06 | MET-A-015 | Play confirmation only after successful registration; distinguish checkout if useful and retain visual feedback. |
| I-06 | Pre-arrival task information | SW-33, SW-34, SW-38; TEAM-07 | MET-A-021 | Show precise assignment details before arrival, including vest, tools or equipment. Clarify predefined versus incident-specific instructions. |
| I-07 | Flexible staffing | SW-17; OP-S06 | To refine | Consider operator-controlled increases in required staffing rather than uncontrolled overbooking. |
| I-08 | Expected arrival information | SW-18; OP-S03 | To refine | Investigate a reliable ETA or progress indication. |
| I-09 | Operational readiness | SW-35; OP-S16 | To refine | Distinguish activation, preparation, established operation and stand-down; clarify states with Metro. |
| I-10 | Active-scenario dashboard | OP-01–03 | Operator UI work | Focus on affected area and coordination after activation; reduce map prominence. |
| I-11 | Simultaneous chats and task progress | OP-04–05 | Operator UI work | Display relevant station chats and progress together; see operator design proposal. |
| I-12 | One-way broadcasts | OP-18–19 | MET-A-022, MET-A-029 (check overlap) | Send announcements to relevant stewards without direct replies; clarify recipients, including available employees not yet assigned. |
| I-13 | Steward redirection | OP-13 | To refine | Allow deliberate reassignment; clarify acknowledgement, declining, notification, release/reservation and concurrent changes. Drag-and-drop is a proposal only. |
| I-14 | En-route communication | OP-14 | MET-A-029 | Allow communication before arrival; clarify recipient rules. |
| I-15 | Train counts and DID information | OP-26–28 | To refine | Display total required trains and distribution by relevant DID. |
| I-16 | Station ordering | OP-06, OP-21 | Operator UI work | Order staffing and chats by operational relevance. |
| I-17 | Dashboard clock | OP-09 | Operator UI work | Display a clock. |
| I-18 | Configurable dashboard | OP-02, OP-08 | Operator UI work | Consider rearranging, minimising and expanding components. |
| I-19 | Structured scenario suggestions | OP-30–31 | MET-A-019 | Investigate structured input and evaluate M3/M4 separately; no conclusion on recommendation accuracy. |
| I-20 | Individual task completion | OP-05, OP-29 | MET-A-021 | Allow stewards to report completed tasks and operator to monitor progress. Reconsider Sprint 6 refinement; distinguish individual checklist items from TASK_DONE. |

## Other feedback and scope

The participant feedback registers retain additional requests that
are not yet refined, including PIO communication, shuttle train
assignments, cross-area information and passenger information.

They should not automatically become sprint scope.

## Backlog follow-up

Investigate D-01 and D-08 first.

D-02 may share a cause with either; do not count the same underlying
defect twice.

D-03 is an independent usability problem to consider.

Use the repository's Defect Report template and link the evidence
and MET-A-027. Check existing issues before creating duplicates.

The PBI mappings and severity assessments above are proposals,
not approved decisions.

Record issue numbers and decisions once agreed.

Prioritise existing workflow reliability before expanding scope.