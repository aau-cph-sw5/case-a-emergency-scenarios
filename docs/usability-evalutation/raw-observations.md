# Raw observations

Related issue: MET-A-027

## Participants

| ID | Role |
| --- | --- |
| S1 | Steward |
| S2 | Steward |
| S3 | Steward |
| O1 | Operator |

The participants have been anonymised.

## Test environment

| Field | Value |
| --- | --- |
| Test date | 25 November 2026 |
| Location | Metro Service |
| Operator line group | M1/M2 |
| Steward devices | Personal Android phones; intended university hardware unavailable |
| Device models and Android versions | To be confirmed |
| Backend, steward and operator application versions | To be confirmed |
| Deployment environment and scenario data | To be confirmed |
| Notification support in tested build | To be confirmed |

## Timing during the test

We originally planned to record the time taken to complete
each task using a stopwatch.

During the test, we found this difficult in practice. The
stewards generally understood the tasks immediately and
often performed the requested action before we had time
to properly start or stop the timer.

Some tasks also happened in direct succession. For example,
finding a station and registering that they were on their
way often happened as part of the same interaction.

Because of this, we do not have reliable individual timings
for all participants and tasks.

O1 began exploring the dashboard independently and came across
several planned tasks before we introduced them. We let the
operator continue rather than interrupt the exploration. This
limited the number of separate timings we could record.

The timings below are the ones that were written down during
the sessions. They should be treated as approximate timings.

Missing timings have not been estimated afterwards.

## Recorded timings

### Steward live test

All times are in seconds.

| Task | S1 | S2 | S3 |
| --- | --- | --- | --- |
| Find station | N/A | N/A | ~10, including en route |
| En route | N/A | N/A | Included above |
| Confirm arrival | N/A | N/A | ~1 |
| Understand coverage | N/A | N/A | 20+ |
| Scenario change | N/A | N/A | ~16 |
| Find chat | N/A | N/A | N/A |
| Send message | N/A | N/A | N/A |
| Checkout | N/A | N/A | ~6 |

N/A means that a reliable timing was not recorded.

The station identification and en-route actions were timed
together for S3, so we cannot determine the individual
duration of each action.

The coverage task took more than 20 seconds, but an exact
completion time was not recorded.

The notes also contain a total session duration of
approximately 15 minutes. This is not a task completion time.

Source: S3, `forsøg.txt`.

### Initial interaction with the application

The following timings were recorded separately from the
live test for S3.

| Interaction | Time |
| --- | --- |
| Select | 4 seconds |
| Swipe | 2 seconds |
| Find chat | 3 seconds |
| Write message | 19.3 seconds |
| Checkout | 6.5 seconds |

Source: S3, `notes.txt`.

These timings are kept separate from the live test because
we cannot verify that the tasks were conducted under the
same conditions.

## Task observations

### Steward 1

| Task | Observation |
| --- | --- |
| Find station | Later mentioned that the relevant station should be more visible. |
| En route | Positive feedback on being able to report that they are on their way. |
| Arrival | Positive feedback on check-in. Requested clearer confirmation. |
| Coverage | Multiple stewards were able to select the same station despite its staffing requirement. |
| Scenario change | Discussed how changes should be communicated and noticed. |
| Chat | Positive feedback on using chat for non-urgent communication. |
| Checkout | Checkout was discussed and attempted. Final system state was not verified. |

### Steward 2

| Task | Observation |
| --- | --- |
| Find station | Station selection was observed during the test. |
| En route | Workflow was discussed, but no separate timing or result was recorded. |
| Arrival | Check-in was confirmed by the interviewer. |
| Coverage | Needed help finding the separate list of affected stations. |
| Scenario change | Identified the change during the session. Later commented on the visibility of the scenario number. |
| Chat | Received a reply. Mentioned that the chat was difficult to find. |
| Checkout | Final completion was not documented sufficiently. |

### Steward 3

| Task | Observation |
| --- | --- |
| Find station | Timed together with en-route registration. |
| En route | Approximately 10 seconds together with station selection. |
| Arrival | Approximately 1 second. |
| Coverage | Confusion regarding the red station indicator and staffing numbers. Excess staffing was observed. |
| Scenario change | Identified the new scenario during the facilitated test. |
| Chat | The participant did not initially notice an incoming message. |
| Checkout | Approximately 6 seconds. |

### Operator

| Task | Recorded time | Observation |
| --- | --- | --- |
| O1 – Find and understand scenario | 20 seconds | Found the scenario affecting Lindevang and inferred the meaning of the staffing indicators. Focused on the affected area. |
| O2 – Activate scenario | N/A | Independently found how to activate a scenario. |
| O3 – Understand coverage | 3 seconds | Identified that a steward was on their way. Noticed the missing yellow en-route status on the map. |
| O4 – Communication | N/A | Found the incoming message immediately. Requested broadcast communication. |
| O5 – End scenario | N/A | Quickly found how to stop the scenario correctly. |
| O6 – Switch scenario | N/A | Stopped the current scenario and activated another instead of using the switch button. |
| O7 – Discover scenario changes | N/A | No observation recorded. |

N/A means that no reliable timing was recorded. The two recorded
times are individual observations from O1.

Source: `usability_test_operator 25-11.docx`, pages 4–5.

## Errors and assistance

The observations include instances of confusion, assistance
from interviewers and unexpected system behaviour.

We did not consistently record the number of incorrect
actions per task and participant.

A complete user error rate cannot therefore be calculated.

The defects observed in the system are documented separately
in [findings.md](findings.md).

## Source material

The following material was used when compiling the
observations:

- S1 before-interview.
- S1 test recordings and transcripts.
- S1 after-interview.
- S2 before-interview.
- S2 usability test transcripts.
- S2 after-interview.
- S3 interview and test transcripts.
- S3 `notes.txt`.
- S3 `forsøg.txt`.
- O1 `usability_test_operator 25-11.docx`, pages 1–7.
- O1 `Ny optagelse 3.html` and `Ny optagelse 4.html` (before-interview).
- Observations and clarification from the test team.

The original recordings and full transcripts are kept
separately from the repository in our OneDrive.

Some recordings contain background noise and automatically
generated transcripts contain recognition errors. Unclear
sections have not been used as definitive evidence.

## Observation template for future tests

| Field | Observation |
| --- | --- |
| Participant | |
| Task | |
| Expected result | |
| Actual result | |
| Start time | |
| First correct answer | |
| Completion time | |
| Assistance given | |
| User errors | |
| System defects | |
| Difficulty rating | |
| Comments | |
| Final outcome | |

For future tests, we should record the instruction and
task boundaries alongside the screen interaction, where
recording is permitted.

This would allow us to calculate timings afterwards
instead of relying entirely on the stopwatch during
the session.
