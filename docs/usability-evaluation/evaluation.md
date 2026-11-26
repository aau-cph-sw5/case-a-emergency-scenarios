# Usability test evaluation

Related issue: MET-A-027

## Purpose

Metro Service has tasked us with developing a system to support
stewards and operators during fallback scenarios.

Throughout development, we have made decisions about how the
requested functionality should be implemented, how information
should be presented and how the users should interact with
the system.

The purpose of the usability test was to evaluate these decisions
with the people who would actually be using the application.

We wanted to see whether our interpretation of their needs
corresponds to their expectations, whether the implemented
workflows make sense to them and whether there are aspects of
their work that we have not taken into consideration.

The main focus of MET-A-027 was whether stewards could quickly
identify the relevant stations and tasks. We extended the
evaluation to cover the remaining steward workflow and the
operator dashboard, as the two roles interact with the same
system.

The evaluation is not intended to establish whether Metro needs
the system or whether it performs better than their existing
solution. The need for the system has already been established
through the project.

Instead, we focus on the user experience of the solution we
have developed and how well our design supports the intended
functionality.

## Participants and method

The usability test was conducted on 25 November 2026 with:

- Three stewards (S1, S2 and S3).
- One M1/M2 operator (O1).

All four participants were Metro Service employees.

The test consisted of a preliminary-interview, task-based interactions
with the application, field observations and an after-interview.

The preliminary-interviews gave us context for understanding the
participants' expectations and interpreting their feedback.

During the test, we observed how they interacted with the
functionality we had developed, including which interactions
they understood immediately and which required further
explanation.

The after-interviews gave the participants an opportunity to
reflect on our solution and suggest changes based on their
experience with it.

See the [test protocol](test-guide/test-protocol.md) and
[interview guide](test-guide/interview-guide.md) for the
planned procedure.

The actual observations and timings are documented in
[raw-observations.md](raw-observations.md).

## Quantitative results

| Metric | Stewards (n = 3) | Operator (n = 1) |
| --- | --- | --- |
| Standalone time to correct station identification | Not reliably recorded | Not applicable |
| Station selection and en route | Approx. 10 seconds (S3) | Not applicable |
| Arrival confirmation | Approx. 1 second (S3) | Not applicable |
| Coverage interpretation | 20+ seconds (S3) | 3 seconds |
| Scenario change | Approx. 16 seconds (S3) | Not recorded |
| Checkout | Approx. 6 seconds (S3) | Not applicable |
| Scenario selection | Not applicable | 20 seconds |
| User error rate | Not calculable | Not calculable |
| Independent task success rate | Not calculable | Not calculable |

We originally intended to record the time taken to complete
each task.

However, the stewards generally understood the basic
interactions immediately and often performed the requested
action before we could reliably start or stop the timer.

Several interactions also happened in direct succession,
making it difficult to separate them into individual tasks.

Although this limited our ability to collect quantitative
data, the observation that the participants quickly understood
several of the interactions is relevant to the usability
evaluation.

It indicates that these parts of the interface were generally
understandable to the participants without requiring extensive
explanation.

The operator began exploring the dashboard independently and
came across several of the functions before we could introduce
them as separate tasks.

We chose to let him continue, as this gave us insight into
how he naturally navigated the application and which information
he considered relevant.

The available timings have been retained, but they are
individual observations rather than comparable measurements
across participants.

We also did not consistently record incorrect actions or
assistance across all tasks and therefore cannot calculate
a reliable error rate.

See [raw-observations.md](raw-observations.md) for the complete
recorded observations.

## Evaluation of the steward application

### Task evaluation

| Task | Result |
| --- | --- |
| Find station and task | Station selection was generally understood. The participants suggested making relevant stations more visible and providing more specific task information before arrival. |
| Register en route | The purpose of the interaction was understood and received positively. Duplicate reservations exposed a problem with the staffing logic. |
| Confirm arrival | One of the more straightforward interactions. Additional confirmation through sound and clearer button labels was suggested. |
| Understand coverage | The participants understood the general purpose of the overview, but some coverage colours, staffing numbers and navigation caused confusion. |
| Scenario changes | Participants interacted with changes during the test, but independently noticing changes during other work remains insufficiently evaluated. |
| Chat | The participants understood the purpose and saw value in written communication. Discoverability, notification visibility and accessibility could be improved. |
| Checkout | The interaction was generally understood. Additional confirmation was suggested. |
| Offline behaviour | The controlled offline task was replaced by chat testing. Offline usability remains unverified. |

### Understanding the implemented workflows

One of the positive observations from the test was how quickly
the stewards understood several of the core interactions.

The process of selecting a station, registering that they were
on their way, confirming arrival and checking out generally
made sense to them.

These are interactions we have designed based on our
understanding of their responsibilities during fallback
scenarios.

The fact that the participants were generally able to recognise
the purpose of these interactions and perform them quickly
supports our approach to the basic steward workflow.

S2 specifically described check-in as intuitive and easy to
perform.

The ability to register that a steward is on their way was
also received positively, as it makes their intended assignment
visible before they arrive.

The feedback concerning these interactions primarily focused
on improving the confirmation provided by the system rather
than changing the general workflow.

For example, the participants suggested clearer button labels
and audible confirmation when checking in or checking out.

This indicates that we should retain the general interaction
while improving how the application communicates the outcome
of an action.

### Station selection and coverage

The participants understood the purpose of the graphical
overview and the ability to see which stations require
staffing.

However, the test exposed some issues with how staffing
information is presented and maintained.

In particular, multiple stewards were able to select the
same station even though the required staffing had already
been reserved.

There was also confusion regarding the colours used to
represent station coverage.

These issues concern the implementation of the overview
rather than the usefulness of having such an overview.

The participants' feedback supports the idea of displaying
staffing information, but shows that the information needs
to be sufficiently clear and consistent for the stewards
to understand where their help is needed.

The interviews also made us reconsider how much information
the individual steward needs to see.

Rather than displaying every affected station as a potential
assignment, it may be more useful to focus on stations that
still require staffing.

Based on the participants' descriptions of their working
areas, we also discussed associating steward accounts with
working zones.

This could allow the application to prioritise nearby and
relevant stations without requiring the steward to look
through the entire overview.

These are proposed refinements to the station selection
workflow, not changes that have been evaluated yet.

See TEAM-02–04 in [steward-feedback.md](steward-feedback.md)
and D-01, D-02, I-02 and I-03 in [findings.md](findings.md).

### Task information

The feedback concerning task descriptions helped us understand
what the stewards expect from the information associated with
their assignments.

S1 wanted to know more precisely what the task involves before
arriving at the station.

This would allow the steward to prepare while travelling,
for example by putting on a vest or finding the necessary
tools or equipment.

S2 explained that experienced stewards often already know
the general procedures associated with a fallback scenario.

The two perspectives are not necessarily contradictory.

The application should provide access to the relevant task
information without requiring experienced stewards to read
instructions they are already familiar with.

More specific information about the current assignment,
including any necessary preparations, should be available
before arrival.

The feedback supports including task information in the
application while giving us a better understanding of how
and when that information should be presented.

### Communication and chat

The stewards generally saw value in having written
communication available in the application.

They particularly mentioned situations where information
does not require an immediate response or where it would
be useful to access the information again later.

This supports our decision to include chat functionality
as part of the steward experience.

However, the test also showed that the current presentation
of the chat could be improved.

S2 found the chat difficult to locate, and S3 did not
initially notice an incoming message.

S1 also brought up dyslexia and explained that some
employees already use speech-to-text when writing messages
on their phones.

This was something we had not properly taken into
consideration when designing the chat.

The feedback therefore concerns both discoverability
and accessibility.

We should investigate how the chat can be made easier
to access and whether employees can use a microphone
to dictate messages through the existing keyboard or
the application itself.

The participants' preference for using the radio for urgent
communication also helps define the intended role of the
chat functionality within our solution.

### Notifications and interaction during work

The interviews gave us a better understanding of the
conditions in which the steward application will be used.

During a fallback scenario, stewards may be helping passengers
or performing other operational tasks rather than actively
using their phones.

They may therefore not notice information simply because
it has become available in the application.

S1 and S3 raised concerns about noticing new scenarios,
changes and incoming messages while their phones were
in their pockets.

Based on this feedback, we discussed having distinct alarms
when a scenario starts and ends, as well as clearer
notifications for changes affecting an assignment.

The participants also suggested audible confirmation
of status changes.

These suggestions do not change the purpose of the
functionality we have developed, but help us understand
how the interaction should work when the application
does not have the steward's full attention.

The feedback concerning gloves, screen readability and
dyslexia also shows that we need to consider more than
whether an interaction works when tested at a desk.

The proposed notification and accessibility improvements
still need to be evaluated on the intended devices.

## Evaluation of the operator application

### Task evaluation

| Task | Result |
| --- | --- |
| Find and understand a scenario | Found the relevant scenario intuitively and inferred the meaning of the staffing indicators. |
| Activate a scenario | Independently found the activation functionality. |
| Understand coverage | Quickly identified that a steward was on their way. Noticed the missing yellow en-route status on the map. |
| Communication | Found the incoming message immediately. Requested additional ways of communicating with relevant stewards. |
| End scenario | Quickly found how to stop the active scenario. |
| Switch scenario | Stopped the current scenario and activated another instead of using the dedicated switch button. |
| Discover scenario changes | Insufficient observations to evaluate the interaction. |

### Understanding the implemented workflows

The operator's overall impression of the application was
positive.

He liked the general structure, visual design and layout,
and described the application as intuitive to navigate.

During the test, he began exploring the dashboard independently
and found several of the functions before we introduced
the corresponding tasks.

This was a particularly useful observation, as it allowed
us to see how he chose to navigate the interface without
being directed towards specific elements.

He independently found scenario activation and stand-down,
quickly identified that a steward was on their way and
located an incoming message immediately.

These observations support several of the interaction
and navigation decisions we have made during development.

However, when changing scenarios, he stopped the current
scenario and activated another instead of using the
dedicated switch functionality.

This gives us reason to investigate whether the dedicated
switch interaction corresponds to the operator's expectations
or whether its purpose and placement need to be clearer.

### Dashboard layout

The operator generally liked the visual presentation of
the dashboard, but his feedback made us reconsider the
importance of its individual components.

In particular, he considered the map useful when selecting
and understanding a scenario.

Once a scenario has been activated, however, his attention
shifts towards the stewards and their assignments.

At this point, he would prefer to use more of the dashboard
space for staffing information, station chats and task progress.

He also explained that geographical information is already
available on other screens in the control room.

The feedback therefore supports having a graphical scenario
overview, but suggests that its prominence should change
depending on what the operator is currently doing.

Rather than removing the map entirely, it could be minimised
during an active scenario and remain accessible when needed.

This is an example of a design decision that made sense
during development but could be better adapted to the user's
actual information needs.

The proposed layout is documented in
[operator-feedback.md](operator/operator-feedback.md#design-proposals).

### Staffing and coordination

The operator saw particular value in being able to receive
and follow status updates from several stewards simultaneously.

He understood the purpose of the staffing overview and
quickly identified that a steward was on their way.

This supports the general approach we have taken to making
steward status information available to the control room.

The feedback also confirmed the importance of preventing
unintended duplicate station reservations.

The operator does not want to spend time resolving conflicts
about which steward selected a station first.

In addition, he expressed interest in being able to redirect
a steward when the situation changes.

This gives us a better understanding of the relationship
between steward-selected assignments and the operator's
responsibility for coordinating the overall situation.

The self-selection workflow should remain straightforward
for the steward, while the operator may need a way to
intervene when necessary.

Redirection is a proposed extension of the existing
workflow and has not been evaluated yet.

### Task progress

One of the operator's strongest requests was the ability
to follow the completion of individual steward tasks.

Although displaying task descriptions is useful for the
steward, the operator explained that knowing how far the
steward has progressed would also be valuable.

He would like stewards to be able to mark tasks as completed
and see these updates directly on the dashboard.

This introduces an additional perspective on the task
functionality we have been working with.

For the steward, the information supports understanding
and preparing for an assignment.

For the operator, it supports coordination and awareness
of the operational preparations.

The feedback suggests that the same task information
could serve both roles in different ways.

### Communication and operational information

The operator understood the chat functionality and saw
value in receiving written information from the stewards.

However, he found that opening individual station chats
and writing separate messages required more attention
than he would want to dedicate to the application during
a fallback scenario.

He would prefer to follow the relevant chats directly
from the dashboard and be able to communicate with several
stewards through a shared broadcast function.

This does not indicate that the chat itself is unwanted.

Rather, it gives us a better understanding of how the
operator expects to interact with it.

He also requested that the dashboard make better use of
the operational information associated with the scenario,
particularly relevant Destination IDs and the number of
trains required.

The general feedback was that the interface should focus
more closely on the information and interactions relevant
to the affected area.

### Scenario suggestion functionality

The operator did not find the free-text scenario suggestion
particularly relevant to his own workflow.

He explained that the operators already discuss which
scenario to use and was unsure what information he would
enter beyond the relevant station names.

He suggested structured inputs as a possible alternative.

However, he also thought the functionality might be more
useful for operators working with M3/M4, where there are
more scenarios to choose between.

This is useful feedback on how the proposed interaction
fits the operator's expectations.

It does not establish whether the underlying recommendation
functionality performs correctly, nor can we generalise
his preferences to operators working with other lines.

## Findings across both roles

### Shared functionality and different information needs

Testing both roles gave us a better understanding of how
the same functionality serves different purposes.

| Functionality | Steward perspective | Operator perspective |
| --- | --- | --- |
| Station selection | Identify where their help is needed. | Understand how staffing is distributed. |
| Status reporting | Register their current status through a simple interaction. | Follow several employees without requesting individual updates. |
| Task information | Understand and prepare for their assignment. | Follow the progress of the operational preparations. |
| Graphical overview | Identify relevant stations and access operational information. | Understand the affected area and monitor staffing when needed. |
| Chat | Access and send relevant written information. | Follow communication without unnecessary navigation or individual interactions. |
| Scenario updates | Notice changes affecting their responsibilities. | Communicate and coordinate changes across the affected area. |

Although the two applications represent the same underlying
scenario, they should not necessarily present the same
information in the same way.

The feedback supports our approach of having separate
interfaces for the two roles.

It also gives us a better understanding of how those
interfaces could be adapted further to their individual
responsibilities.

### Design decisions supported by the evaluation

| Design decision | Feedback and observations |
| --- | --- |
| Simple steward status interactions | Generally understood and performed quickly. Check-in was specifically described as intuitive. |
| Separate en-route and arrival statuses | Both roles saw value in knowing that a steward is on their way before they arrive. |
| Graphical scenario and staffing overview | Both roles understood its purpose and saw value in the information, although presentation and consistency need improvement. |
| Digital status reporting | Received positively by both roles as a way of sharing staffing information. |
| Written communication | Considered useful for appropriate types of communication, although the two roles have different expectations of the interface. |
| Scenario-specific task information | Considered relevant by the stewards, particularly before arrival. The operator also wants to follow task completion. |
| Operator dashboard structure | The operator liked the general interface and independently found several functions. |
| Separate steward and operator interfaces | The feedback confirmed that the two roles need different information and interactions. |

These observations support retaining the general approach
to the application.

Most of the feedback concerning these areas was about how
the functionality could be presented, extended or made
more reliable rather than rejecting its purpose.

### Design decisions that need reconsideration

| Area | What we learned |
| --- | --- |
| Station selection | Displaying all affected stations may provide more information than the steward needs when choosing an assignment. |
| Staffing logic | Reserved staffing and actual coverage must be distinguished, and unintended duplicate assignments should be prevented. |
| Task descriptions | Information about specific preparations and equipment should be available before arrival. |
| Task progress | The operator also needs information about whether individual tasks have been completed. |
| Dashboard layout | The map is useful during scenario selection but becomes less important during an active scenario. |
| Chat interaction | Individual conversations are not sufficient for all operator communication needs. |
| Notifications | Important information needs to be noticeable even when the steward is not looking at the phone. |
| Accessibility | We need to account for dyslexia, small screens, gloves and divided attention. |
| Scenario suggestions | The free-text interaction may not correspond to the tested operator's expectations. |
| Scenario lifecycle | Scenario activation and established scenario operation represent different stages. |

The individual requests and proposed changes are documented
in [steward-feedback.md](steward-feedback.md),
[operator-feedback.md](operator/operator-feedback.md) and
[findings.md](findings.md).

## Evaluation based on ISO 9241-11

### Effectiveness

The participants generally understood the purpose of the
implemented functionality and were able to perform several
of the core interactions.

The steward status reporting workflow was understood,
and the operator independently found several of the
functions provided by the dashboard.

However, staffing inconsistencies and some difficulties
with finding and interpreting information affected the
experience of using the system.

Not every task was verified independently, so we cannot
establish an overall task completion rate.

The results nevertheless support the general approach
to the core workflows while identifying areas where the
implementation needs improvement.

### Efficiency

Several of the basic interactions appeared quick and
required little explanation.

In particular, station selection, check-in, checkout,
scenario activation and stand-down were generally
understood.

The participants were also able to navigate parts of
the application independently.

The main difficulties concerned finding relevant
information, interpreting coverage and navigating
between individual chats.

The feedback suggests that efficiency within our
application could be improved by reducing unnecessary
information and interactions.

Although reliable aggregate timings are unavailable,
the observed interactions provide qualitative insight
into which parts of the interface are straightforward
and which require more effort.

### Satisfaction

Both the stewards and the operator responded positively
to several aspects of our solution.

The stewards saw value in the status reporting workflow,
staffing overview and written communication.

The operator particularly liked the structure, visual
design and intuitive navigation of the dashboard.

The participants also engaged with the functionality
and provided concrete suggestions for how it could
better support their responsibilities.

The feedback indicates that the general approach to
the application corresponds to several of their
expectations, while also identifying specific changes
that could improve the user experience.

No numerical satisfaction score was collected.

## Research questions

| Research question | Result |
| --- | --- |
| Can stewards quickly and correctly identify their station and tasks? | The participants generally understood station selection. Reliable individual timings are missing. More focused station information and precise task descriptions were suggested. |
| Can stewards register and understand their status without help? | The basic status interactions were generally understood and received positively. Clearer labels and confirmation sounds could improve the experience further. |
| Is the graphical overview understandable and correct? | The purpose of the overview was understood and considered useful. Coverage inconsistencies and some presentation issues need improvement. |
| Are changes to an active scenario clear? | Participants interacted with scenario changes, but independently noticing updates during other work remains insufficiently evaluated. |
| Is offline information and its freshness understood? | Not sufficiently evaluated. |
| Do the implemented workflows fit the stewards' actual work? | The general workflow was received positively. The feedback identified refinements concerning station relevance, task preparation, notifications and accessibility. |
| Does the operator dashboard provide a useful overview? | The operator liked the interface and independently navigated several functions. He suggested adapting the layout during active scenarios to focus on staffing, task progress and communication. |

## Limitations

The main methodological limitation was the incomplete
collection of quantitative data.

The participants often performed interactions before
we could reliably record individual task timings.

The operator session also became more exploratory
than originally planned.

The participants received varying degrees of introduction
to the application, and assistance was sometimes provided
during the tasks.

We therefore cannot establish a reliable independent
task completion rate or user error rate.

The participant sample was limited to three stewards
and one M1/M2 operator. Their feedback gives us useful
insight into the intended users' experience, but may
not represent every employee's preferences.

The scenarios were simulated and did not necessarily
create the same time pressure as an actual fallback
scenario.

However, the tests took place in the Metro's working
environment, and the participants were sometimes
interrupted by their normal responsibilities.

This gave us relevant context for understanding how
the application may be used alongside other work.

Personal Android phones were used because the intended
university hardware was unavailable.

Device-specific behaviour, particularly notifications,
screen readability and background behaviour, therefore
requires further evaluation.

The tested application versions still need to be
confirmed.

The proposed improvements, including zone-based
assignments, dashboard changes and steward redirection,
have not been evaluated through a subsequent usability
test.

Finally, the evaluation was designed to investigate
the user experience of our proposed solution, not to
measure performance differences between our application
and Metro's existing tools since we had no access to that.

The results should therefore be interpreted in relation
to the functionality and design decisions evaluated
during the test.

## Conclusion

The usability test gave us the opportunity to evaluate
whether the solution we have developed corresponds to
the expectations of the people who will be using it.

Overall, the participants understood and responded
positively to several of the core workflows and
functionality we have implemented.

The stewards generally understood the process of
selecting a station and reporting their status, while
the operator found the dashboard intuitive and saw
value in being able to follow staffing and progress.

These observations support the general direction we
have taken in developing the application.

The feedback also helped us identify where our
interpretation of the users' needs could be improved.

In particular, we gained a better understanding of
which information should be prioritised for each role,
how task information could support both preparation
and progress reporting, and how the application needs
to behave when users are occupied with other work.

The test also exposed concrete issues with the
implementation that should be addressed, particularly
concerning duplicate station reservations, coverage
information and information visibility.

Most of the suggested changes build on the functionality
we have already developed rather than requiring a
different overall approach.

The evaluation therefore provides qualitative support
for several of our design decisions, while giving us
a more informed basis for refining the application.

The quantitative acceptance criterion remains unresolved
due to the limitations of our timing and error collection.

See [findings.md](findings.md) for the identified defects
and proposed improvements.