# Usability test evaluation

Related issue: MET-A-027 

## Purpose

We conducted the usability test to see whether the system we have developed makes sense for the people who will actually be using it during fallback scenarios.

The main focus of MET-A-027 was whether stewards could quickly identify which stations require bemanning and what they need to do. 
We extended the test to cover the rest of the steward workflow and included an operator to evaluate the other side of the system.

Besides testing the functionality itself, we wanted to gain a better understanding of how Metro Service currently operates and whether some of the assumptions we made during development correspond to their actual way of working.

## Participants

- 3 stewards.
- 1 operator.

All participants were Metro Service employees.

The current evaluation primarily covers the three stewards, as the detailed operator interview and observation results have not yet been included.

## Quantitative results

### Time to correct answer

We originally intended to time each participant individually for every task.

What we experienced during the test was that the stewards generally understood the tasks immediately and often performed the requested action before we could properly start or stop the timer.

Several tasks also happened in direct succession without a natural break between them. For example, identifying a station and registering that they were on their way often happened as part of the same interaction.

We did manage to record some approximate timings for S3.

| Task | Approximate time |
| --- | --- |
| Find station and register en route | 10 seconds |
| Confirm arrival | 1 second |
| Understand station coverage | 20+ seconds |
| Identify scenario change | 16 seconds |
| Checkout | 6 seconds |

Additional timings were recorded during S3's initial interaction with the application.

Our general observation was that the stewards were quick to understand and perform the basic interactions. 
The difficulty with collecting timings was largely due to how quickly the interactions happened rather than the participants having difficulties completing them.

However, we cannot provide a reliable average or median time to correct station identification because we do not have comparable individual measurements.

### Error rate

The stewards generally understood what they were supposed to do during the core tasks.

There were still instances where participants needed help finding information or where the application behaved differently from what they expected.

We did not consistently record the number of incorrect actions across all tasks and participants. We therefore cannot calculate a reliable error rate.

We also distinguish between a participant making an incorrect choice and the application allowing an incorrect or unintended state.

For example, the application allowing two stewards to select the same station when only one is required is a system issue rather than necessarily a participant error.

## Evaluation of tasks

### Task 1 – Find station and task

The stewards generally understood how to select a station and were able to do so quickly.

However, the feedback made us reconsider how we present stations to individual stewards.

Stewards already work within different geographical areas or zones. When a scenario occurs, they generally focus on the stations within their area and coordinate with the other stewards and the control room.

At the moment, displaying all affected stations means that the steward may need to look through information that is not necessarily relevant to them.

One suggestion we came up with based on the test was to associate steward accounts with the zones they work in.

When a scenario is activated, the application could then show or prioritise the nearest stations within their assigned zone that still require coverage.

We could also limit the main station selection view to stations that actually require staffing, rather than displaying all stations affected by the scenario.

This would reduce the amount of information the steward needs to go through before deciding where to go.

We would still need to account for situations where a steward is working outside their usual zone or needs to assist in another area.

The steward should also be able to access the task associated with a station before arriving.

S1 explained that having more information about the task beforehand would allow them to prepare while travelling. 
Depending on the task, this could involve putting on a safety vest, finding the necessary equipment or making other preparations before reaching the station.

The station selection workflow should therefore help the steward understand both where they need to go and what they need to prepare for.

### Task 2 – En route

The ability to register that a steward is on their way was received positively.

It gives the control room and other stewards information that would otherwise need to be communicated over the radio.

However, we found that multiple stewards could select the same station even though the required staffing had already been reserved.

If a station only requires one steward, another steward should not unintentionally be able to reserve the same assignment while someone is already on their way.

Otherwise, several stewards may travel to the same station while another station remains without coverage.

S2 also mentioned that knowing when someone is expected to arrive could be useful for the control room.

Being able to see that someone is on their way does not necessarily tell the operator how long the station will remain without coverage.

### Task 3 – Confirm arrival

Check-in was one of the more straightforward interactions during the test.

The stewards generally understood the purpose of the function, and S3 was able to perform the action in approximately one second.

S1 suggested adding a sound when checking in as an additional confirmation that the action has been registered.

This would be particularly useful when the steward is occupied with other work and does not have time to inspect the screen after performing the action.

We also discussed having a different confirmation sound for checkout.

S3 commented on the wording of the confirmation button. It should be clearer what the user is actually confirming.

The interaction itself worked well, but the feedback before and after performing it could be improved.

### Task 4 – Understand station coverage

This was one of the areas where we found the most issues.

During the test, multiple stewards were able to select the same station even though the required staffing had already been reserved.

This led to uncertainty about who should stay assigned to the station and how the coverage information should be interpreted.

S3 was also confused by a station being displayed in red after checking in. The participant expected the colour to change once the station was covered.

S2 needed help locating the separate list of affected stations.

The feedback made us consider whether all affected stations need to be displayed to the steward in the first place.

The main information the steward needs when selecting a station is which stations still require staffing. Showing stations that do not require any action may make it more difficult to identify the relevant ones.

A possible improvement would be to display stations requiring coverage as the primary overview, while keeping the wider scenario overview accessible separately if needed.

This could be combined with zone-based filtering to make the station selection more relevant to the individual steward.

An additional point from S2 was that a station may sometimes need more stewards than originally planned.

We should therefore prevent unintended duplicate reservations while still considering whether the operator needs a way to request additional staffing when necessary.

### Task 5 – Scenario changes

The participants were able to interact with changes to the active scenario during the test.

However, some of the changes were introduced or pointed out by the interviewers.

We cannot conclude that the participants would always notice a change independently while doing their normal work.

S2 mentioned that the scenario number should be more visible.

S1 and S3 also raised concerns about how they would notice a new scenario or change when their phones were in their pockets.

Based on the discussions during the test, we should consider having a distinct alarm when a scenario starts and ends.

It is important that the stewards notice both events. Missing the start of a scenario could mean that they do not know they are needed somewhere, while missing the end could mean that they continue performing a task that is no longer necessary.

Important changes to an active scenario should also be communicated clearly.

This should be tested again without telling the participant beforehand that a change is coming.

### Task 6 – Chat

The stewards saw potential in the chat functionality, particularly for communication that does not require an immediate response.

Several examples were discussed where written messages could reduce unnecessary communication on the radio.

There were also some issues with the current interaction.

S2 thought the chat was difficult to find, and S3 did not initially notice an incoming message.

An important point brought up by S1 was dyslexia among employees.

Some colleagues already use the microphone on their phones to dictate messages instead of typing them.

This is something we had not properly taken into consideration when developing the chat.

We should investigate whether the chat can support speech-to-text through the phone's existing keyboard or through a microphone function accessible from the chat itself.

The purpose would be to allow stewards who have difficulties writing to communicate without having to type out a message manually.

This could also be useful when the steward is occupied with other work.

The feedback made it clear that chat should not replace the radio. For information that needs to be communicated immediately, the radio is still the preferred tool.

### Task 7 – Checkout

Checkout was generally understood.

S3 completed the interaction in approximately six seconds during the live test.

As with check-in, S1 suggested clearer confirmation that the action had been registered.

Having separate sounds for check-in and checkout could make the two actions easier to distinguish and provide additional confirmation without requiring the steward to inspect the screen.

We do not have enough system logs or observations from the operator side to verify every checkout end-to-end.

### Offline behaviour

Offline behaviour was included in the original task sheet, but the revised test plan replaced the controlled offline task with chat testing.

During the interviews, stewards mentioned that they sometimes experience problems with radio coverage or miss parts of messages.

This supports the need to retain access to relevant information, but does not verify that our offline implementation works as intended.

## Qualitative analysis

We went through the interviews and observations and grouped the feedback into themes.

We included both problems with the application and information about the existing Metro workflow that affects how the system should be designed.

We also included suggestions from our own discussions following the test, where these were based on problems or working conditions described by the participants.

### Communication and the radio

One of our initial motivations for the project was to reduce the amount of communication required over the radio during fallback scenarios.

The interviews confirmed that there are situations where the radio becomes crowded and stewards have to wait before they can communicate.

Information can also be missed when someone is on another channel or occupied with another conversation.

However, the stewards did not describe the radio as a generally bad solution.

It is familiar, quick and useful for communicating information to several people at once.

S2 in particular pointed out that speaking over the radio can be faster than writing a message.

Our system should therefore reduce unnecessary radio communication and provide information that can be looked up later, while leaving urgent communication to the existing radio procedures.

Sources: S1, S2 and S3 interviews.

### Notifications and attention

During development, we assumed that the stewards would often have their phones available because they already use them for work, for example when checking tickets.

However, during fallback scenarios, ticket inspection may no longer be their main responsibility.

They may instead be helping passengers, managing a station or preparing for other operational tasks.

This means that their phones may remain in their pockets for longer periods.

S1 and S3 raised concerns about noticing new scenarios, changed tasks or incoming messages without actively looking at their phones.

We therefore consider noticeable alarms at the start and end of a scenario particularly important.

Changes that affect the steward's current assignment should also be distinguishable from ordinary chat notifications.

We also discussed adding confirmation sounds to check-in and checkout. These should only be played once the corresponding status change has been confirmed by the system.

It does not matter how clearly information is displayed if the steward does not know that there is new information to look at.

The notification behaviour should be tested on Metro's actual devices, including situations where the phone is locked, in a pocket or on silent.

Sources: S1 after-interview; S3 test and interview; test team discussions.

### Shared overview and zone-based station selection

The ability to see which stations require coverage and which stewards are already on their way was generally received positively.

However, there were differences in how much information the participants wanted to see.

S2 explained that once a steward has an assignment, it is not necessarily relevant to constantly monitor the status of all other stations.

S1 also described how stewards already operate within different geographical areas.

Based on this, we discussed whether steward accounts could be associated with the zones they normally work in.

The application could use this information to determine which stations are relevant to the individual steward when a scenario starts.

Rather than displaying every affected station, the main assignment view could show the nearest relevant stations that still require coverage.

The steward would then spend less time looking through stations that are already covered, do not require staffing or are located outside their working area.

There are some details that need to be clarified before implementing this.

For example, a steward may be working in another zone temporarily, or there may be situations where additional help is needed outside their usual area.

We also need to clarify whether the nearest station should be determined from the assigned zone, the steward's current position or another source of information.

The idea is to reduce irrelevant information, not to prevent stewards from accessing information they may need.

The operator would still need access to the full overview.

Sources: S1 before-interview; S2 interviews; test team discussions.

### Presentation of information

Several comments concerned the visibility of information already available in the application.

These included:

- The relevant station.
- The active scenario number.
- Staffing numbers.
- The list of affected stations.
- The chat button.
- The text on confirmation buttons.

The information is not necessarily missing from the system. In some cases, it is simply not visible enough or is not where the participant expects it to be.

We should also consider whether all the information currently displayed is necessary for the individual steward.

Only showing stations that still require staffing in the main assignment view could make it easier to identify where help is needed.

This is particularly relevant when the application is used on a small screen during other work.

Sources: S1 after-interview; S2 usability test and after-interview; S3 test; test team discussions.

### Staffing requirements

We found an issue where multiple stewards could reserve the same station despite its configured staffing requirement.

If a station requires one steward, two stewards should not unintentionally be able to reserve or check in against that same staffing requirement.

The application should take into account both stewards who have arrived and stewards who are already on their way.

Otherwise, a station may continue to appear available even though someone has already taken responsibility for it.

This is particularly relevant if we introduce zone-based station selection, as several stewards in the same zone could otherwise be directed towards the same station.

During the interviews, S2 also described situations where additional stewards may be needed because of passenger numbers or other operational factors.

We therefore need to clarify how additional staffing should be handled.

The normal workflow should prevent unintended duplicate assignments, while the operator may need a way to increase the staffing requirement when the situation calls for it.

Sources: S1 and S3 test observations; S2 interviews.

### Task information and preparation

S1 would like to know what they need to do before arriving at the station.

This is not only a matter of understanding the task itself. More precise information could also help the steward prepare while travelling.

Depending on the assignment, they may need to put on a safety vest, find tools or bring other equipment.

If this information is only available after checking in, the steward may arrive without having had the opportunity to prepare.

S3 also mentioned wanting to know why a particular scenario was activated.

S2 explained that experienced stewards often already know the general tasks associated with a scenario.

We should therefore distinguish between general procedures and information specific to the current assignment.

The steward should be able to quickly access the task, any relevant preparations and the reason for the scenario, without having to go through unnecessary information.

Sources: S1 after-interview; S2 interviews; S3 interview.

### Accessibility and field use

The participants brought up several practical considerations that are easy to overlook when developing and testing the application at a desk.

These include:

- Using the phone while wearing gloves.
- Reading information on a small screen.
- Receiving information without looking at the phone.
- Difficulties with reading and writing.

Dyslexia was specifically brought up by S1 during the discussion about chat.

Some employees already use speech-to-text when writing messages on their phones.

We had not taken this into consideration when initially designing the chat functionality.

Providing access to a microphone for dictating messages could make the chat more accessible to these employees.

We should investigate whether the existing Android keyboard already provides the necessary functionality on Metro's devices before implementing a separate speech recognition solution.

S3 also requested larger and clearer staffing numbers on the map.

The application needs to be usable by employees with different needs and under the conditions in which they actually work.

Sources: S1 test and after-interview; S3 test.

### Scenario lifecycle

S3 pointed out that activating a scenario does not necessarily mean that the Metro is already operating according to that scenario.

There may be a period where the control room and stewards are preparing for the new operational setup.

It would be useful to distinguish between a scenario being announced and the new operation being established.

S2 also mentioned that stewards may need information about scenarios outside their own area, for example when
