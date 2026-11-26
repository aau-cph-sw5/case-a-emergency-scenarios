# Operator feedback

Related issue: MET-A-027 (#26)
Test date: 25 November 2026
Participant: O1
Role: Operator (M1/M2)

## Purpose

This document collects feedback concerning the operator side of the
application based on the usability test conducted with Metro Service.

The purpose of including the operator in the usability test was to
evaluate how well the system supports coordination between the control
room and the stewards during a fallback scenario.

We wanted to investigate whether the information presented in the
dashboard is relevant to the operator, whether the implemented
workflows make sense in relation to their existing procedures, and
whether there is any functionality or information missing.

We distinguish between:

- Feedback given directly by the operator.
- Observations made during the usability test.
- Suggestions made by stewards concerning the operator side.
- Suggestions from our own team based on the interviews and observations.

The feedback has been paraphrased and translated from the Danish
interviews and observation notes.

## Current workflow

### Radio communication

The operator generally considers the radio a good tool for operational
communication.

One of its main advantages is that the operator has control over the
communication channel and can interrupt other conversations when
necessary. This makes it relatively easy for the operator to communicate
important information to the stewards.

However, the stewards cannot interrupt the operator or each other.
When several employees need to communicate at the same time, they may
have to wait before they can report back.

This becomes particularly relevant during a fallback scenario, where
several stewards may need to report that they have arrived at a station,
completed a task or are ready to take on another responsibility.

The operator explained that this creates a bottleneck, as only one
person can communicate at a time.

Other limitations mentioned during the interview include:

- Employees may struggle to get through when the channel is occupied.
- Information may be missed when several people need to communicate.
- Radio coverage is not always available.
- Private radio conversations can temporarily make employees
  unavailable to the operator.
- Some employees may miss announcements during their breaks.
- Information communicated over the radio is not necessarily
  available for the steward to look up afterwards.

The operator did not want to replace the radio with the application.
Instead, the application should supplement the existing communication
by allowing information that does not require an immediate verbal
response to be communicated digitally.

Sources:

- Operator before-interview.
- Ny optagelse 3.html, 00:00–05:14.
- Ny optagelse 4.html, 15:33–17:50.

### Existing fallback procedures

Before activating a fallback scenario, the operator discusses the
situation with colleagues in the control room and considers which
scenario is most appropriate.

The operator needs to have an idea of how the situation will be
handled before communicating the decision to the stewards.

This includes considering:

- Which parts of the network are affected.
- Which operational changes need to be made.
- Which Destination IDs (DIDs) are relevant.
- How many trains are required for the scenario.
- Whether sufficient stewards are available.
- Which stations and other assignments require staffing.
- Whether employees need to be moved from their existing responsibilities.

The operator explained that the introduction of predefined fallback
scenarios has already improved communication.

Instead of having to explain the entire operational setup over the
radio, the operator can refer to a specific scenario that the stewards
also have access to.

This gives both roles a shared understanding of what is expected to
happen and which responsibilities need to be covered.

However, activating a scenario and establishing the actual scenario
operation are not the same thing.

There may be a considerable amount of preparation and coordination
before the new operational setup is fully established.

This supports the feedback from S3, who suggested that it would be
useful to distinguish between a scenario being activated and the
scenario operation actually being established.

Sources:

- Operator before-interview.
- Ny optagelse 4.html, 00:47–09:00.
- Ny optagelse 4.html, 11:43–14:15.

### Steward availability and staffing

The operator does not necessarily know exactly where every steward
is at a given time.

Stewards have different responsibilities depending on their working
area, shift, time of day and the current situation.

The operator can have an expectation of where employees are, but
cannot assume that they are always available or located where expected.

For example, a steward may be occupied with another task or may have
had to leave an area because of an incident.

The operator may also start coordinating staffing before a fallback
scenario is formally activated.

This means that station staffing is not always a process that starts
when the scenario is activated in the application.

The application should support the operator in maintaining an overview
of reported staffing and availability without presenting assumptions
about a steward's location as confirmed information.

This is also relevant to our suggestion of associating steward accounts
with their working zones.

A working zone could be useful for identifying relevant assignments,
but should not be treated as confirmation of the steward's actual
physical location.

Sources:

- Operator before-interview.
- Ny optagelse 4.html, 11:54–13:32.

## Usability test results

### Test procedure

The operator test was originally planned as a task-based usability
test where we would introduce individual tasks and record the time
taken to complete each one.

After the first few tasks, the operator began exploring the dashboard
independently.

He naturally came across several of the functions we had planned
to test before we had the opportunity to introduce them as separate
tasks.

We chose to let him continue rather than interrupt his exploration.

This gave us insight into how an actual operator navigates the
dashboard, which information he looks for first and which parts of
the application he considers relevant.

As a result, the session gradually became more exploratory than
originally planned.

We were therefore unable to record reliable timings for every task,
but we received a considerable amount of qualitative feedback
during the exploration and the interview afterwards.

### Recorded task results

| Task | Recorded time | Observation |
| --- | --- | --- |
| O1 – Find and understand a scenario | 20 seconds | Found the relevant scenario intuitively and interpreted the staffing indicators. |
| O2 – Activate a scenario | Not recorded | Independently found out how to activate a scenario. |
| O3 – Understand station coverage | 3 seconds | Identified that a steward was on their way. Noticed that the map did not display the yellow en-route status. |
| O4 – Communication with steward | Not recorded | Found the incoming message immediately and requested the ability to communicate with all relevant stewards at once. |
| O5 – End an active scenario | Not recorded | Quickly found out how to stop the scenario correctly. |
| O6 – Switch active scenario | Not recorded | Stopped the current scenario and activated another instead of using the dedicated switch button. |
| O7 – Discover and understand scenario changes | Not recorded | No sufficient observation was recorded. |

The available timings are individual observations from one operator
and should not be used to calculate an overall task completion time.

We also do not have a complete record of incorrect actions or
assistance across all tasks.

### Task 1 – Find and understand a scenario

The operator found the scenario he was looking for relatively
intuitively.

He interpreted the numbers on the map as indicators of where
stewards were required and primarily focused on the affected area
of the network.

The geographical overview was useful during scenario selection,
as it helped him understand which part of the network the scenario
concerned.

However, he later explained that the same level of geographical
information is not necessarily relevant once a scenario has
already been activated.

### Task 2 – Activate a scenario

The operator independently found out how to activate a scenario.

No significant difficulties were recorded during this task.

The operator continued exploring the application after activation,
which made it difficult to separate the following interactions
into individual timed tasks.

### Task 3 – Understand station coverage

The operator quickly identified that a steward was on their way
to a station.

He also noticed the steward tasks associated with the stations.

One issue he pointed out was that the map did not reflect the
yellow en-route status.

If the staffing overview is represented both on the map and in
the staffing plan, the information should be consistent between
the two.

This is also related to the coverage issues identified during
the steward tests.

### Task 4 – Communication with steward

The operator found the incoming message immediately.

He saw value in receiving written information concerning less
critical tasks, but wanted to be able to communicate with several
stewards at once.

He also questioned what he was expected to write to the stewards
at the individual staffed stations.

In his normal workflow, he would usually give the stewards an
assignment and expect them to report back once they had completed
it.

He should not necessarily have to initiate a conversation with
each steward individually.

The operator also mentioned that the staffing indicators on the
map could be larger and that most of his attention was directed
towards the staffing overview on the right-hand side of the
dashboard.

### Task 5 – End an active scenario

The operator quickly found out how to stop the active scenario.

No significant difficulties were recorded.

The test does not provide sufficient evidence to verify whether
all stewards received and noticed the corresponding scenario
termination information.

### Task 6 – Switch active scenario

When asked to switch to another scenario, the operator stopped
the current scenario and activated a new one.

He did not use the dedicated scenario switch button.

Although he managed to reach the intended outcome, he did not
use the workflow we had implemented specifically for this action.

This could indicate that the switch button is not sufficiently
visible or that stopping and starting a scenario feels more
natural to the operator.

We should investigate why the operator chose this approach before
deciding whether the button, its placement or the workflow itself
needs to be changed.

### Task 7 – Discover and understand scenario changes

No sufficient observation was recorded for this task.

We therefore cannot evaluate whether the operator would independently
notice changes to an active scenario or understand their consequences
for the staffing situation.

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

#### Context

The operator generally liked the layout and visual design of
the application.

He described the interface as intuitive and explained that the
systems they currently work with do not have the same focus on
visual design and usability.

However, he had several suggestions for how the available space
could be used differently during an active scenario.

The map was considered useful when selecting a scenario, as the
operator needs to understand which stations and parts of the
network are affected.

Once the scenario has been activated, the operator's focus changes
from understanding the geographical situation to coordinating
the people involved.

At this point, he would rather have an overview of:

- Which stations still require staffing.
- Which stewards are on their way.
- Which stewards have arrived.
- What is being communicated from the individual stations.
- How far the stewards are with their tasks.
- Relevant operational information for the active scenario.

The operator already has access to geographical information on
other screens in the control room.

Our application therefore does not necessarily need to dedicate
a large part of the dashboard to information that is already
available elsewhere.

He suggested that the map could become smaller or be minimised
once the scenario is active, with the option to open it again
if needed.

The space could instead be used to display the relevant station
chats and the progress of the stewards' tasks.

He also explained that the screens used in the control room have
a relatively high resolution, so individual components do not
necessarily need to take up as much space as they currently do.

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

#### Context

One of the main advantages the operator saw in the application
was the possibility of receiving status updates from several
stewards at the same time.

In the current workflow, stewards may need to wait for other
employees to finish communicating before they can report their
own status.

Allowing stewards to report that they are on their way or have
arrived through the application would remove the need for some
of these radio calls.

The operator also confirmed the issue we identified during
the steward tests regarding duplicate station reservations.

If a station requires one steward, only one steward should be
able to take responsibility for that available assignment.

If someone is already on their way, other stewards should be
encouraged to select a different station where staffing is still
needed.

The operator should not have to spend additional time resolving
conflicts about who selected a station first.

This means that the staffing logic needs to account for both
stewards who have arrived and stewards who are already on
their way.

However, the operator also expressed interest in having more
control over where the stewards are going.

If the operator disagrees with a steward's selected station or
the operational situation changes, it would be useful to be
able to redirect that steward.

He specifically asked whether it was possible to communicate
with a steward while they were still on their way.

At the time of the test, this was not supported by the current
communication workflow.

The duplicate reservation issue and the ability to redirect
stewards are related, but they serve different purposes.

Preventing duplicate reservations should reduce unnecessary
coordination, while redirection would give the operator a way
to deliberately change an assignment when necessary.

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

#### Context

The operator was positive towards the idea of supplementing
the radio with written communication.

However, he also explained that writing individual messages
to several stewards would take considerably longer than
communicating the same information over the radio.

During a fallback scenario, the operator has several other
responsibilities and cannot dedicate all of his attention
to the application.

He can listen and communicate over the radio while working
with other systems, whereas writing messages requires him
to actively move his attention to the chat.

He therefore considered the current chat workflow more
time-consuming than necessary.

One of his strongest requests was the ability to send a
message to all relevant stewards at the same time.

During the test, a steward asked for an additional steward
at a station. The operator explained that he would have to
use the radio to communicate this request because the
application required him to select an individual recipient.

He does not necessarily know which steward is available
or closest to the station.

A broadcast function would allow him to communicate this
type of information without first having to identify a
specific recipient.

The operator suggested that this should be a one-way
communication function rather than a group conversation
where every steward can reply directly.

He also found it confusing that stewards assigned to trains
could communicate through the same station chat as stewards
physically located at the station.

This makes it difficult to determine who is communicating
and which assignment the message concerns.

In addition, the individual station chats were not arranged
in an order that made sense to him, which meant he had to
spend time finding the correct conversation.

His preferred solution was to have the relevant station
chats visible directly on the dashboard during an active
scenario.

This would allow him to follow communication without
having to open and close several different conversations.

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

#### Context

The operator wanted the dashboard to include more of the
operational information available in the existing fallback
scenario material.

In particular, he wanted to see the Destination IDs relevant
to the affected area and how many trains should operate
under each DID.

He also wanted to see the total number of trains required
for the selected scenario.

This would allow him to access the relevant information
without having to consult the existing fallback material
separately.

Another important request was the ability to follow the
progress of the stewards' tasks.

The operator explained that the application would be
particularly useful if stewards could mark individual
tasks as completed and the operator could follow this
progress directly from the dashboard.

For example, a steward could indicate that they are ready
at their assigned position without having to make a radio
call.

This would allow the operator to follow the situation while
continuing with other responsibilities.

The feedback suggests that reporting task completion may
be more valuable to the operator than requiring additional
written communication.

Sources:

- Operator after-interview, questions 4, 5 and 6.
- Ny optagelse 4.html, 03:23–04:42.
- Ny optagelse 4.html, 07:40–09:00.

### Scenario suggestion functionality

Related PBI: MET-A-019. This feedback concerns the relevance and input design of the feature, not the accuracy of its recommendations.

The operator did not consider the current free-text scenario
suggestion functionality particularly relevant to his own
workflow on M1/M2.

He explained that the operators already discuss the situation
and determine which fallback scenario is appropriate before
communicating their decision.

He was also unsure what information he would need to enter
into the free-text field beyond the relevant station names.

He suggested that structured inputs, such as selectable
fields or checkboxes, might make more sense.

However, he also mentioned that the functionality could
potentially be more useful for operators working with
M3/M4, where there are more scenarios to choose between.

We should therefore not interpret this feedback as a general
rejection of scenario suggestions.

It does indicate that the current free-text implementation
may not correspond particularly well to the workflow of
the operator we tested with.

Further evaluation with an M3/M4 operator would be relevant
before deciding how the functionality should be changed.

Sources:

- Operator after-interview, question 5.

## Operator's proposed dashboard layout

The following design proposal was created based on the
operator's feedback concerning the layout of the dashboard
during an active scenario.

Design asset: `assets/operator-active-scenario-layout.png` (add after confirming approval for repository use).

### Layout before scenario activation

Before a scenario has been selected and activated, the
operator primarily needs information that helps them
understand and choose the relevant scenario.

The map is useful at this stage because it provides a
geographical representation of the affected area.

Relevant information includes:

- Available scenarios.
- Affected stations and tracks.
- Operational changes associated with the scenario.
- Relevant Destination IDs.
- The number of trains required.
- Staffing requirements.

### Layout during an active scenario

Once the scenario has been activated, the operator's
main focus becomes coordination and monitoring.

The proposed layout therefore reduces the amount of
space occupied by the map and makes more room for
information concerning the stewards.

The map remains available in a smaller format and
can be expanded when needed.

The main part of the dashboard instead contains the
relevant stations, their chats and the corresponding
steward tasks.

Each station could have its own section containing:

- Station name.
- Current staffing status.
- Task list.
- Number of completed tasks.
- Messages from the relevant stewards.

This would make it possible for the operator to follow
several stations simultaneously without having to
navigate between individual views.

The staffing overview remains available on the right-hand
side of the dashboard.

This allows the operator to quickly identify stations that
still need coverage and distinguish between stewards who
are on their way and those who have arrived.

The stations should be ordered according to their
relevance or priority within the active scenario rather
than an arbitrary ordering.

### Broadcast communication

The proposal also includes a shared message field that
allows the operator to communicate with all relevant
stations or stewards from the dashboard.

This is based on the operator's request for a one-way
broadcast function.

The operator should not need to open a separate chat
for every station to communicate the same information.

We still need to clarify how the recipients of these
messages should be determined.

For example, a broadcast could be sent to all stewards
involved in the scenario or to a relevant group of
employees within an affected area.

### Design status

The supplied layout is a design proposal based on the
operator's feedback. The displayed staffing values are part of
the proposal and are not additional measured test results.

It is not the version of the interface that was evaluated
during the usability test.

The proposed layout would need to be implemented and
evaluated separately before we can conclude that it
improves the operator's workflow.

Related feedback: OP-01–OP-10, OP-18, OP-19 and OP-29.

## Proposed steward redirection functionality

The operator requested the ability to redirect a steward
who is already on their way to a station.

This is particularly relevant when several stewards are
travelling towards the same station or the situation
changes after a steward has selected an assignment.

The following visualisation illustrates a possible
interaction for handling redirection from the staffing
overview.

Design asset: `assets/operator-steward-redirection.gif` (add after confirming approval for repository use).

### Suggested workflow

The operator should be able to identify a steward who is
on their way to a station and redirect them to another
station where staffing is required.

One possible implementation would be to use a drag-and-drop
interaction within the staffing overview.

For example:

1. The operator identifies a station where more stewards
   are on their way than necessary.
2. The operator selects the steward who should be redirected.
3. The operator selects another station requiring staffing.
4. The system updates the assignment.
5. The steward receives information about the changed assignment.
6. Both the steward application and the operator dashboard
   reflect the updated staffing situation.

The previous reservation should be released when appropriate,
and the new reservation should be reflected in the coverage
information.

The steward should clearly be able to see that their assignment
has changed, where they are now expected to go and what they
need to do at the new location.

### Points to clarify

Before implementing this functionality, we need to discuss:

- Whether redirection should require acknowledgement from
  the steward.
- How the steward should be notified.
- What happens if the steward cannot take the new assignment.
- Whether redirection is only relevant while the steward
  is en route or also after arrival.
- How the previous assignment is released.
- How concurrent staffing changes are handled.
- How task information changes when a steward is redirected.
- Whether the operator should provide a reason for the
  reassignment.

The operator explicitly requested the ability to redirect
stewards.

The drag-and-drop interaction is a proposed way of implementing
this functionality and has not been evaluated as part of the
original usability test.

Related feedback: OP-11–OP-14.

## Positive feedback

Although the operator had several suggestions for improvements,
his overall impression of the application was positive.

He particularly liked:

- The general structure of the application.
- The visual design and layout.
- How intuitive it was to navigate the interface.
- The ability for stewards to report their status digitally.
- The possibility of reducing communication over the radio.
- Having timestamps associated with messages.
- Being able to see which stations require staffing.
- The idea of following the progress of the stewards' tasks.

He described the underlying structure of the application
as very good.

The feedback was not that the general concept needed to
be changed, but that certain parts of the interface should
be better adapted to what the operator actually needs
during an active scenario.

The operator saw potential for the application to reduce
the amount of time spent waiting for individual status
updates over the radio.

However, this was his expectation of how the system could
help in practice. We did not measure the actual time saved
compared to the current process.

Sources:

- Operator after-interview, supplementary questions F and G.
- Operator before-interview.
- Ny optagelse 4.html, 07:40–09:00.

## Observed usability problems

| ID | Observation | Related finding |
| --- | --- | --- |
| OP-D01 | The map did not display the yellow en-route status consistently with the staffing overview. | D-08 |
| OP-D02 | The operator stopped the current scenario and started a new one instead of using the dedicated switch button. | D-09 |
| OP-D03 | Station chats were not presented in an order that made sense to the operator. | D-10 |
| OP-D04 | It was unclear who was communicating when stewards assigned to trains used the same station chat as stewards at the station. | D-11 |
| OP-D05 | The operator had to open individual station chats to follow communication. | D-12 |
| OP-D06 | The staffing indicators on the map were considered too small. | D-13 |
| OP-D07 | Multiple stewards could take responsibility for the same station even though only one was required. | D-01 |

The duplicate station reservation issue was also identified
during the steward tests.

The operator independently confirmed that duplicate reservations
should be prevented. This supports the steward observations;
it does not establish another independently observed occurrence.

The scenario switch observation does not necessarily mean
that the switch functionality is technically broken.

It indicates that the operator did not choose the intended
workflow and that we should investigate why.

See [findings.md](findings.md) for the corresponding defects
and suggested backlog items.

## Steward feedback concerning the operator side

During the steward interviews, several participants mentioned
functionality they thought would be useful for the control room.

Some of this functionality already exists in our system,
while other suggestions would require changes or additional
features.

This feedback is kept separate from the direct operator
feedback to make it clear which role initially brought up
the individual suggestions.

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

The operator interview confirmed several of these points.

In particular, both roles see value in knowing which stations
are covered, which stewards are on their way and where
additional staffing is still needed.

Both roles also identified duplicate station reservations
as something that should be prevented.

However, the interviews also showed that there may be
situations where more stewards are required than originally
specified by the scenario.

We therefore need to distinguish between unintended
duplicate assignments and deliberately requesting
additional staffing.

One possible solution would be to allow the operator to
adjust the staffing requirement when additional stewards
are needed.

This is a proposed solution that still needs to be
discussed with Metro.

### Communication

| ID | Feedback | Participant |
| --- | --- | --- |
| OP-S08 | Communicate directly with the relevant steward. | S1, test discussion |
| OP-S09 | Handle non-urgent written messages without occupying the radio. | S1, S3 |
| OP-S10 | Share relevant information across work areas and radio channels. | S2 |
| OP-S11 | Support communication involving PIO. | S1 |
| OP-S12 | Keep relevant messages available for later reference. | S1, S3 |

Both the operator and the stewards see potential in using
written communication for information that does not require
an immediate verbal response.

However, neither role considers the application a replacement
for the radio.

The operator's feedback made it particularly clear that
written communication should not introduce unnecessary
additional work in the control room.

Some of the steward suggestions concern communication with
other roles in addition to the operator.

We still need to clarify who should have access to the
different communication functions.

### Scenario information and updates

| ID | Feedback | Participant |
| --- | --- | --- |
| OP-S13 | Communicate the reason a scenario has been activated. | S1, S3 |
| OP-S14 | Provide more precise task information before the steward arrives, including relevant preparations. | S1 |
| OP-S15 | Clearly communicate changes and cancellations. | S1 |
| OP-S16 | Indicate when scenario operation has been established. | S3 |
| OP-S17 | Distribute relevant general operational information, such as travel guarantee. | S2 |

S1 explained that knowing more about the task before arriving
would make it possible to prepare while travelling.

Depending on the assignment, the steward may need to put on
a safety vest, find tools or bring specific equipment.

The relevant task information should therefore be available
before the steward arrives at the station.

We need to clarify whether this information should be part
of the predefined scenario, defined by the operator when
activating the scenario or provided through a combination
of the two.

The operator also explained that establishing scenario
operation may require considerable preparation.

This supports S3's feedback regarding the distinction
between scenario activation and established scenario operation.

## Implications for the operator and administration side

The following suggestions came from our own discussions and
observations during the usability test.

Some are supported directly by feedback from the operator,
while others are possible solutions to problems identified
during the steward tests.

They should not all be interpreted as functionality
explicitly requested by the operator.

### OP-T01 – Steward working zones

Stewards already work within different geographical areas.

Based on this, we discussed whether steward accounts could
be associated with the zone or zones they work in.

The steward application could use this information to show
or prioritise nearby stations requiring staffing when a
scenario starts.

This would make the assignment overview more relevant to
each steward and reduce the need to look through stations
outside their usual working area.

The operator interview also confirmed that employee
availability depends on factors such as working areas,
time of day and current responsibilities.

However, the operator explained that he cannot always know
exactly where each steward is.

A working zone should therefore be used as information
about the steward's expected working area rather than as
confirmation of their actual location.

We need to determine:

- Who should be able to assign a steward to a zone.
- Whether zones should be linked to the account permanently
  or be configurable per shift.
- Whether the operator needs to see each steward's current
  working zone.
- Whether a steward can be assigned to more than one zone.
- How the system determines which station is nearest.
- How the operator should handle situations requiring
  assistance from another zone.
- Whether redirection should allow the operator to assign
  a steward outside their usual working zone.

As we are already working with account administration,
zone configuration could potentially be part of that
functionality.

We should discuss whether the responsibility belongs to
an administrator, the operator or another role within Metro.

The operator should still retain access to the full relevant
scenario and staffing overview.

Related feedback: SW-07, SW-14, SW-15, SW-22 and OP-13.

### OP-T02 – Filter the steward assignment overview

We discussed only showing stations that still require
staffing in the steward's main assignment view.

This would mean that stations without staffing requirements
or stations where the required staffing has already been
reserved would not appear as available assignments.

The operator independently suggested that stewards should
be encouraged to select another station if the required
number of stewards is already on their way.

This supports the proposed filtering of available assignments.

The operator would still need to see the full staffing
situation, including stations that are already covered.

If more stewards are needed at a station, the operator
may need a way to increase the staffing requirement so
that the station becomes available again.

The steward's own current assignment should remain visible
even when the station no longer requires additional staffing.

This could be combined with zone-based filtering to make
the available assignments more relevant to the individual
steward.

Related feedback: SW-07, SW-10, SW-15, SW-16, SW-17,
OP-11 and OP-12.

### OP-T03 – Prevent duplicate assignments

The test showed that multiple stewards could select a
station where the required staffing had already been reserved.

If a station requires one steward, the normal assignment
workflow should prevent another steward from unintentionally
taking that same assignment.

The system needs to account for stewards who are already
on their way, rather than only counting those who have arrived.

The coverage information should remain consistent between
the steward application and the operator dashboard, including
when multiple stewards select stations at approximately
the same time.

The operator confirmed that he does not want to spend
additional time resolving conflicts concerning which
steward selected a station first.

Preventing duplicate reservations should therefore be
considered separately from allowing the operator to
deliberately redirect stewards or request additional staffing.

Related feedback: OP-11, OP-12 and OP-13.

Related findings: D-01, D-02 and D-08 in
[findings.md](findings.md).

### OP-T04 – Scenario start and end alarms

Based on the feedback from the stewards, we discussed having
a distinct alarm when a scenario starts and ends.

The stewards should not risk missing that a scenario has
been activated or that their current assignment is no
longer necessary.

From the operator side, these alarms could be triggered
automatically when the corresponding activation or
stand-down action has been successfully registered.

The operator should not need to send a separate chat
message to communicate that the scenario has started
or ended.

Important changes to a steward's assignment, including
redirection, may also require their own notification
behaviour.

The operator explained that employees sometimes miss
information communicated over the radio.

This supports the need to make important information
available through more than one communication channel.

However, the exact alarm behaviour was suggested during
the steward evaluation and by our own test team, rather
than explicitly specified by the operator.

We need to discuss whether the operator needs confirmation
that stewards have received or acknowledged important
information.

The existing radio procedures should remain in place.

Related feedback: SW-01, SW-02, SW-03, SW-06 and OP-S15.

### OP-T05 – More precise task information

The steward should be able to access more specific information
about their assignment before arriving at the station.

This could include:

- What they need to do.
- Why the task is necessary.
- Whether they need any particular equipment.
- Whether anything needs to be prepared before arrival.
- Additional instructions specific to the current situation.

The feedback from the operator also introduced another
aspect of the task information.

In addition to the steward being able to read the tasks,
the operator wants to be able to follow their completion.

A task should therefore potentially contain both the
information needed by the steward to perform it and a
completion state that can be displayed to the operator.

The steward could mark individual tasks as completed,
allowing the operator to follow the progress without
having to request the same information over the radio.

General task descriptions could be part of the predefined
scenarios, while information specific to an incident may
need to be provided or adjusted when the scenario is activated.

The operator should not necessarily have to manually enter
all of this information each time.

Related feedback: SW-33, SW-34, SW-38, OP-05 and OP-29.

### OP-T06 – Accessible chat communication

The steward interviews brought up dyslexia and the use of
speech-to-text when communicating through written messages.

We should investigate allowing stewards to dictate messages
through a microphone rather than requiring them to type manually.

The operator would still receive a normal written message,
so this would not necessarily require changes to the
operator's own chat interaction.

It should remain possible for the steward to review and edit
the dictated message before sending it.

We should first investigate whether the existing keyboard
functionality on Metro's devices already provides sufficient
support for speech-to-text.

Related feedback: SW-28 and SW-41.

## Comparison of steward and operator needs

The interviews gave us a better understanding of how the
information requirements differ between the two roles.

Although both roles are working within the same active
scenario, they do not necessarily need to see the same
information or interact with the system in the same way.

| Steward needs | Operator needs |
| --- | --- |
| Quickly identify where help is needed. | Maintain an overview of the affected area. |
| See relevant stations requiring staffing. | See all relevant staffing states. |
| Avoid taking an assignment that is already covered. | Prevent unnecessary duplicate assignments and coordinate available employees. |
| Know what to prepare before arriving. | Follow the progress of several assignments simultaneously. |
| Report status without making unnecessary radio calls. | Receive status updates without having to initiate each interaction. |
| Receive noticeable scenario and assignment updates. | Communicate changes efficiently to the relevant employees. |
| Access chat when needed. | Follow several station chats without unnecessary navigation. |
| Understand their individual assignment. | Be able to redirect employees when necessary. |
| Receive confirmation that an action has been registered. | See that staffing and task completion information has been updated. |

There are also several points that both roles agree on.

### Reducing unnecessary radio communication

Both the operator and the stewards see value in reporting
status digitally.

However, both roles also want to retain the radio for
immediate and time-sensitive communication.

The application should reduce the number of unnecessary
radio calls rather than move every conversation into a
written chat.

### Reliable staffing information

Both roles need the staffing information to be correct.

Duplicate station reservations and inconsistent coverage
indicators create additional work instead of reducing it.

These issues should be addressed before we extend the
staffing functionality with more complex features.

### Relevant information

Both roles expressed a need to focus on the information
that is relevant to their current responsibilities.

For the steward, this means being able to quickly identify
the stations where their help is needed and what their
assignment involves.

For the operator, this means being able to focus on the
affected area, staffing progress, relevant operational
information and communication.

This supports having different information priorities
for the two interfaces rather than displaying the same
overview to both roles.

### Task completion

The stewards want to understand their tasks and be able
to prepare before arriving.

The operator wants to know how far the stewards are with
those tasks without having to request individual updates.

This suggests that the task functionality has value for
both roles, provided that the information is presented
in a way that supports their individual workflows.

## Operator's stated priorities

When asked what he would change first, the operator
primarily focused on the information needed during an
active scenario.

His main priorities were:

1. Focus the dashboard on the affected stations and area.
2. Display the relevant Destination IDs and required
   number of trains.
3. Prevent multiple stewards from taking responsibility
   for the same single-steward assignment.
4. Make it possible to follow the relevant station chats
   and steward task progress directly from the dashboard.
5. Reduce the amount of space occupied by the map once
   a scenario has been activated.
6. Reduce unnecessary scrolling and navigation.

The operator also expressed a strong interest in broadcast
communication and the ability to redirect stewards.

These priorities are based on the operator's response
during the after-interview and should be considered
alongside the findings from the steward tests.

They have not yet been converted into an agreed backlog
priority or implementation plan.

## Suggested development priorities

Based on both the operator and steward feedback, we suggest
the following areas for further development.

### Issues with existing functionality

- Prevent duplicate station reservations and check-ins.
- Make the coverage information consistent between the
  map, staffing overview and steward application.
- Investigate the discoverability of the scenario switch
  functionality.
- Improve the ordering and accessibility of station chats.
- Make it clearer which steward or assignment a message
  originates from.
- Improve the readability of staffing indicators.

### Improvements to the existing workflows

- Introduce a dashboard layout adapted to active scenarios.
- Reduce or minimise the map after scenario activation.
- Display relevant station chats directly on the dashboard.
- Display steward task completion and progress.
- Support one-way broadcast communication.
- Support communication with stewards who are en route.
- Display relevant train counts and Destination IDs.
- Order stations according to operational relevance.
- Add a clock to the dashboard.

### Functionality requiring further refinement

- Operator-controlled steward redirection.
- Flexible staffing requirements.
- Steward working zones and zone-based station selection.
- More specific task information and preparation requirements.
- Distinguishing scenario activation from operational readiness.
- Structured alternatives to free-text scenario suggestions.
- Configurable or rearrangeable dashboard components.

Some of the functionality may already be included in existing
backlog items or be under development.

We should compare these suggestions with the current backlog
before creating additional issues.

The priorities above are our suggestions based on the usability
test and have not yet been agreed with the Product Owner.

## Questions to clarify with Metro

### Staffing and zones

- How are the current steward working zones defined?
- Are working zones fixed for individual stewards or do they
  change between shifts?
- Who should be responsible for managing zone assignments?
- Would it make sense to associate steward accounts with
  their working zones?
- How should additional staffing be requested?
- Should the operator be able to change the required number
  of stewards during an active scenario?
- Should a steward be able to request or decline a reassignment?
- Should redirection require acknowledgement?
- How should redirection affect the previous station reservation?

### Communication and notifications

- Which stewards should receive broadcast messages?
- Should broadcasts be limited to participants in the
  active scenario or also reach other relevant employees?
- Should stewards be able to acknowledge broadcasts without
  replying directly?
- How should communication with stewards assigned to trains
  be distinguished from station-based communication?
- Which events should trigger an alarm on the steward's phone?
- Does the operator need confirmation that important
  information has been received?
- Which types of communication should remain on the radio?

### Scenario and task information

- Should task completion be reported for every individual task
  or only for certain relevant tasks?
- Which task completion updates are relevant to the operator?
- Should task completion be reported by the steward or verified
  by another role?
- Should task descriptions include specific equipment or
  preparation requirements?
- Should the operator be able to add or change instructions
  during an active scenario?
- Which information should be part of the predefined scenario
  and which should be entered when it is activated?
- Would it be useful to distinguish between scenario activation
  and established scenario operation?

### Operator dashboard

- Which information should always remain visible?
- Which information is already available through other systems
  in the control room?
- How should stations be prioritised in the staffing overview?
- Should the dashboard layout change automatically when a
  scenario is activated?
- Should the operator be able to configure the layout individually?
- Would the proposed compact dashboard layout also make sense
  for operators working with M3/M4?
- Would structured scenario suggestions be more relevant
  than the current free-text functionality?

## Limitations

The operator evaluation is based on one participant working
with M1/M2.

We therefore cannot assume that all operators would have
the same preferences or information requirements.

This is particularly relevant to the feedback regarding
scenario suggestions, as the participant specifically
mentioned that the functionality might be more relevant
to M3/M4.

The test was originally planned as a structured task-based
test, but became more exploratory as the operator independently
navigated the application.

Although this provided useful qualitative feedback, it
limited our ability to collect consistent quantitative data.

We only have recorded timings for two operator tasks.

We also do not have a complete record of incorrect actions,
assistance or individual difficulty ratings.

The suggested dashboard layout and steward redirection
interaction are design proposals based on the feedback.

They have not been evaluated through a subsequent usability
test and should not be treated as validated solutions.

The original audio has not been independently checked against the transcripts for this documentation.

The original recordings also contain interruptions from
the operator's normal work.

The written notes from the operator session have therefore
been used alongside the available interview transcripts
when compiling this document.

## Source material

The following material was used when compiling the
operator feedback:

| Source | Content |
| --- | --- |
| usability_test_operator 25-11.docx | Before-interview, task observations, timings and after-interview. |
| Ny optagelse 3.html | Before-interview concerning radio communication and existing tools. |
| Ny optagelse 4.html | Before-interview concerning fallback procedures, staffing and operational communication. |
| Ny optagelse 3.m4a | Original audio recording corresponding to the transcript. |
| Ny optagelse 4.m4a | Original audio recording corresponding to the transcript. |
| operator-active-scenario-layout.png | Design proposal based on the operator's dashboard feedback. |
| operator-steward-redirection.gif | Proposed interaction for redirecting a steward. |
| Steward interview and observation material | Feedback from S1, S2 and S3 concerning coordination with the control room. |
| Test team notes | Additional observations and proposed improvements discussed by the team. |

The available written notes and transcripts were used for
the analysis.

The original audio recordings are retained as source
material for verifying the transcripts and any direct
quotations used in the report.

They are not included in the repository.

## Conclusion

The operator was generally positive towards the application
and found the interface intuitive to navigate.

The feedback supports our original motivation for reducing
the amount of coordination and status reporting that needs
to take place over the radio.

However, the interview also made it clear that introducing
another communication channel does not necessarily reduce
the operator's workload.

If the operator needs to spend additional time writing
individual messages, opening several chats or resolving
duplicate assignments, the application may introduce more
work rather than removing it.

The greatest potential value identified by the operator
was the ability for stewards to report their status and
task completion independently, while the control room
can follow the progress without having to request every
individual update.

The operator also made us reconsider the layout of the
dashboard.

The map is useful when selecting and understanding a
scenario, but once the scenario is active, the operator's
attention shifts towards staffing, task progress,
communication and the relevant operational information.

We should therefore consider adapting the dashboard to
the different stages of the scenario rather than using
the same information hierarchy throughout the entire
workflow.

Several of the operator's requests also support findings
from the steward tests, particularly concerning duplicate
station reservations, staffing information and reducing
unnecessary radio communication.

The radio should remain the primary tool for immediate
operational communication, while the application should
provide a supplementary way of sharing information,
reporting progress and maintaining an overview.

The evaluation gives us a better understanding of how the
system could support both roles and which parts of the
current implementation should be improved.

The proposed changes still need to be refined with Metro
and evaluated before we can conclude that they improve
the overall operational workflow.
