# Usability test protocol

Related issue: MET-A-027

## Purpose

The purpose of the test is to evaluate how well the system
supports stewards and operators during a fallback scenario.

We want to investigate whether stewards can find the relevant
information quickly, understand what they need to do and report
their status back to the control room.

We also want to see whether the workflows we have implemented
make sense in relation to how Metro Service currently operates.

We use the three usability parameters from ISO 9241-11:

- Effectiveness: Can the participants complete the tasks correctly?
- Efficiency: How quickly and easily can they complete them?
- Satisfaction: How do they experience the system, and does it
  fit into their work?

## Participants and setup

The test was planned for:

- 3 stewards.
- 1 operator.
- Students following the individual stewards.
- Students observing the operator side.

The steward tests use the Android application, while the
operator test uses the web application on a PC.

The test takes place in connection with the Metro employees'
normal working day.

The scenarios used in the test are simulated. The test must
not interfere with the actual operation of the Metro, and
the employees' normal responsibilities always take priority.

## Equipment

- Android phones with the steward application.
- PC with access to the operator application.
- Phones for audio recording and timing.
- Interview guides.
- Task descriptions and observation sheets.
- Access to the test environment.

## Test procedure

The procedure below describes the planned test.

Actual deviations, including the operator's exploratory session
and incomplete timings, are documented in
[raw-observations.md](../raw-observations.md).

### 1. Introduction and before-interview

Estimated duration: 15–25 minutes.

Before starting the test, we explain what the system is
intended to do and what we want to investigate.

We make it clear that we are testing the system and not the
participant's ability to do their job.

We ask for consent to observe and record the session.

The before-interview focuses on how the participants currently
work, what tools they use, and what works well or causes
problems in their existing processes.

### 2. Introduction to the application

The participant is given a short introduction to the
application and an opportunity to become familiar with it.

We try to avoid explaining the individual tasks in advance,
as we want to see whether the participant can work out how
to perform them.

Any demonstration or help given before the tasks should be
noted, as it may affect the results.

### 3. Task-based test

Estimated duration: 20 minutes.

The participants are given a series of tasks that represent
the workflows we have implemented.

We ask them to think aloud while completing the tasks, so
we can understand what they are looking for and why they
perform certain actions.

The observers should avoid helping unless the participant
gets stuck. If help is given, it should be recorded.

### 4. Field observation

During the steward tests, we also observe how the application
works in their actual working environment.

This includes:

- Using the phone while moving between stations.
- Reading information while travelling.
- Receiving updates while doing other work.
- Using the application with limited attention.
- Connectivity and environmental interruptions.
- Situations we may not have considered during development.

### 5. After-interview

Estimated duration: 15–20 minutes.

After completing the tasks, we ask the participants about
their experience with the system.

We also ask follow-up questions about anything we observed
during the test, and discuss how they think the application
would fit into their existing way of working.

See [interview-guide.md](interview-guide.md) for the questions
used during the interviews.

## Steward tasks

### Task 1 – Find station and task

A fallback scenario is activated.

Instruction:

> A scenario has been activated. Find out which station you
> need to cover, where you need to be and what you need to do.

We observe:

- Whether the correct station is identified.
- Time to correct station identification.
- Whether the instructions are understood.
- Whether help is needed.

For scenarios where the steward chooses their own station,
the acceptable station choices should be defined beforehand.

### Task 2 – Register en route

Instruction:

> You now need to travel to the station. Register in the
> application that you are on your way.

We observe whether station selection is understandable and
whether the participant understands the difference between
being en route and having arrived.

### Task 3 – Confirm arrival

Instruction:

> You have now arrived at the station. Update your status.

We observe whether the participant can find the arrival
confirmation and whether the status change is clear.

Where possible, we also verify the change on the operator side.

### Task 4 – Understand station coverage

Instruction:

> Look at the overview and tell us which stations are covered
> and which stations still need stewards.

We observe:

- Understanding of colours and symbols.
- Understanding of staffing numbers.
- Whether en-route and arrived stewards can be distinguished.
- Whether the participant can find the necessary information.

### Task 5 – Scenario update

The active scenario is changed from the operator side.

Instruction:

> Continue as normal and tell us if anything changes that
> affects your task.

We observe whether the participant notices the change,
understands what has changed and knows what to do next.

### Task 6 – Chat

The participant receives a message from the control room
and is asked to respond.

We also test sending a message from the steward side.

We observe whether the chat is easy to find, whether incoming
messages are noticed and whether the communication works
in both directions.

### Task 7 – Checkout

Instruction:

> You are finished at the station and need to leave.
> Register this in the application.

We observe whether checkout is understandable and whether
the participant can see that the action has been completed.

### Offline test

The original printed task sheet included a task where the
connection was deliberately interrupted.

During planning, we decided to replace this task with
bidirectional chat testing.

Offline behaviour remains relevant, but it is not considered
a completed controlled test in this evaluation.

## Operator tasks

| Task | Instruction | What we observe |
| --- | --- | --- |
| O1 | Find the relevant scenario and explain it. | Scenario selection and understanding of affected stations. |
| O2 | Activate the scenario. | Activation, confirmation and updates on the steward side. |
| O3 | Identify covered and uncovered stations. | Understanding of staffing numbers, colours and statuses. |
| O4 | Read and respond to a steward message. | Chat navigation and message delivery. |
| O5 | End the active scenario. | Understanding and confirmation of stand-down. |
| O6 | Switch to a different scenario. | Scenario selection and understanding of what happens to the previous scenario. |
| O7 | Identify a change in the active scenario. | Discovery and understanding of the updated information. |

## Data collection

For each task we intended to record:

- Time to completion.
- Whether the task was completed correctly.
- Incorrect actions or answers.
- Whether help was needed.
- Participant comments.
- Observed system defects.
- Perceived difficulty on a scale from 1 to 5.

For Task 1, the main measurement is the time between giving
the instruction and receiving the first correct station answer.

This should be recorded separately from en-route registration.

We distinguish between participant errors and system defects.
A participant should not be marked as having made an error
if the system itself prevents the correct action.

### Task outcome classification for future tests

| Outcome | Definition |
| --- | --- |
| Independent completion | Correct result without assistance. |
| Assisted completion | Correct result after a hint or help. |
| Incorrect completion | Task completed with an incorrect result. |
| Not completed | Participant unable to complete the task. |
| System blocked | System behaviour prevents completion. |
| Not observed | Insufficient evidence to classify the outcome. |

Define the expected result for each task before testing.

For station identification, start timing once the full instruction
has been given and stop at the first correct station answer,
before en-route reporting.

Define acceptable station choices based on the scenario and its
current staffing state.

Record incorrect first answers separately from later corrections,
and report the number of scored attempts with any error rate.

These are refinements for a repeat test, not measurements recovered
from the original sessions.

## Repeating the test

For future tests, we recommend recording the screen and
marking the start of each task where recording is permitted.
This makes it easier to determine the exact task duration
afterwards.

Make sure to request the relevant phones from the university
at the beginning of the semester to ensure you have the correct
hardware.

We had to make do with personal Android phones. This should
be taken into consideration when interpreting screen size,
notification and background behaviour.

The expected answers, tested scenario, application version
and success criteria should be recorded before each session.

This is particularly relevant because manual timing turned
out to be difficult during our test.

See [raw observations](../raw-observations.md) for what was
actually recorded and [evaluation](../evaluation.md) for the
results.