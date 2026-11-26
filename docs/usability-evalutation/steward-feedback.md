# Steward feedback

Related issue: MET-A-027 

## Purpose

This document collects feedback from the three stewards who participated in the usability test.

The feedback includes requested changes, problems with the application and information about their current workflow that we should consider during development.

Some suggestions came directly from the stewards, while others came up during discussions with the interviewers.

We have also included suggestions from our own team based on what we observed and learned during the test.

The descriptions below are paraphrased from the Danish interviews and test notes.

## Notifications

| ID | Feedback | Participant |
| --- | --- | --- |
| SW-01 | Stronger vibration or a more noticeable sound when a scenario is activated. | S1, S3 |
| SW-02 | Notifications need to be noticeable when the phone is in a pocket. | S1, S3 |
| SW-03 | A noticeable notification when a task or scenario changes or is cancelled. | S1 |
| SW-04 | A confirmation sound when checking in, potentially with a separate sound for checkout. | S1 |
| SW-05 | More noticeable notifications for incoming chat messages. | S3 |
| SW-06 | Investigate whether important alerts can be noticed when the phone is on silent. | S3 |

### Context

The stewards explained that they do not always have their phones in their hands during work.

During a fallback scenario, they may stop checking tickets and instead focus on helping passengers or performing other operational tasks.

They need to know that something has changed without constantly checking the application.

Based on the discussions during the test, we consider having a distinct alarm at the start and end of a scenario particularly important.

The steward should not risk missing that a scenario has been activated or that their current assignment is no longer necessary.

A confirmation sound when checking in would also provide additional feedback that the action has been registered.

### Follow-up

Review the existing notification functionality and test it with a locked phone in a pocket.

We should discuss with Metro which events require a more noticeable alarm and which should remain ordinary notifications.

Different confirmation sounds for check-in and checkout should also be considered.

Source references:

- S1 after-interview, 03:35–08:55 and 15:08–17:08.
- S1 after-interview, 10:16–10:57.
- S3 Nørreport, 02:39–04:26 and 18:43–19:04.

## Scenario and station overview

| ID | Feedback | Participant |
| --- | --- | --- |
| SW-07 | Make the relevant station stand out more, potentially using highlighting or blinking. | S1, S2 |
| SW-08 | Make the active scenario number larger or more visible. | S2 |
| SW-09 | Increase the size of the staffing numbers. | S3 |
| SW-10 | Make the difference between uncovered, en route and covered stations clearer. | S3 |
| SW-11 | Make the affected-stations list easier to find. | S2 |
| SW-12 | Keep station names readable on the mobile overview. | S3 |
| SW-13 | Have an overview of the current Metro operation even when the steward is not participating in a scenario. | S2 |
| SW-14 | Have access to relevant scenario information from other areas or lines. | S2 |

### Context

Most of the information requested here is either already present in the application or related to the current overview.

The problem is that some of it is not immediately visible or easy to interpret.

We also need to consider how much of the information is relevant to the individual steward.

Stewards already work within different geographical areas or zones.

Based on this, we discussed whether the main assignment view could be limited to stations that require staffing, with stations in the steward's assigned working area being prioritised.

The general operational overview and information about other scenarios would extend the current functionality.

Source references:

- S1 before-interview, 16:23–17:56.
- S1 after-interview, 19:47–20:35.
- S2 usability test and after-interview.
- S3 Nørreport, 06:25–07:56 and 12:53.

## Staffing and assignments

| ID | Feedback | Participant |
| --- | --- | --- |
| SW-15 | See who is already on their way to a station. | S1, S3 |
| SW-16 | Avoid having multiple stewards select or check in to a station where the required staffing has already been reserved or fulfilled. | S1, S3 |
| SW-17 | Allow additional staffing when the situation requires it. | S2 |
| SW-18 | Give the control room information about when a steward is expected to arrive. | S2 |
| SW-19 | Support assignments to shuttle trains as well as stations. | S3, with related workflow described by S2 |
| SW-20 | Allow stewards to change responsibilities during a longer scenario. | S2 |
| SW-21 | Consider displaying the names of assigned stewards. | S3 observation notes |
| SW-22 | Clarify when a steward should choose a station themselves and when the control room decides. | S1, S2 |

### Context

We found an issue where more than one steward could select the same station even though only one was required.

If a station requires one steward, another steward should not be able to unintentionally reserve or check in against the same requirement.

This should apply from the point where a steward registers that they are on their way, rather than only when they arrive.

Otherwise, two stewards could travel to the same station without knowing that someone else has already taken responsibility for it.

However, S2 also explained that extra staffing may sometimes be necessary.

We need to clarify this with Metro before treating the configured staffing requirement as an absolute maximum. One possibility would be to allow the operator to increase the required staffing when additional help is needed.

There are also assignments that do not necessarily correspond to a physical station, such as staffing a shuttle train.

SW-19, SW-20 and SW-22 are domain requirements or questions that came up during the discussions. They are not fully specified feature requests yet.

SW-21 appears in the observation notes, but it is unclear whether it was suggested by the participant or observer.

Source references:

- S1 before-interview, 08:09–08:57.
- S1 Forsøg 1, 05:51–09:44.
- S2 before-interview and usability tests.
- S3 Kultorvet, 05:17.
- S3 Nørreport, 08:18–10:59.
- S3 notes.txt.

## Chat and communication

| ID | Feedback | Participant |
| --- | --- | --- |
| SW-23 | Use chat for communication that does not require an immediate response. | S1, S3 |
| SW-24 | Allow communication with PIO through the application. | S1 |
| SW-25 | Keep messages available so information can be found again later. | S1 |
| SW-26 | Allow relevant communication while a steward is on their way to a station. | S1, interviewer discussion |
| SW-27 | Allow communication directly with the relevant steward instead of going through another person. | S1, test discussion |
| SW-28 | Support speech-to-text for employees with dyslexia or other difficulties with writing. | S1 |
| SW-29 | Make the chat easier to find in the application. | S2 |
| SW-30 | Allow shared messages or announcements to relevant employees. | S1, S2 |
| SW-31 | Keep using the radio for urgent and time-sensitive communication. | S1, S2, S3 |
| SW-32 | Make it possible to share relevant information across the existing radio channels or work areas. | S2 |

### Context

The stewards generally liked the idea of using chat to reduce unnecessary radio communication.

The radio is still quicker for many operational tasks, especially when information needs to reach someone immediately.

The chat should be designed with this distinction in mind.

An important point brought up by S1 was that some employees are dyslexic and already use speech-to-text when writing messages on their phones.

This was not something we had taken into consideration when initially developing the chat.

We should investigate whether the microphone available through the existing Android keyboard is sufficient or whether it would make sense to provide a more accessible microphone button directly in the chat.

The intended functionality is speech-to-text, allowing the steward to dictate and review a written message before sending it.

This could make the chat more accessible without changing the existing written communication workflow.

Source references:

- S1 Forsøg 1, 08:07–10:20.
- S1 after-interview, 00:15–03:35.
- S1 after-interview, 07:29–08:29 and 17:53–18:58.
- S2 before-interview and after-interview.
- S3 Kultorvet 2, 03:04–04:44.

## Tasks and operational information

| ID | Feedback | Participant |
| --- | --- | --- |
| SW-33 | Be able to read a more precise description of the station's task before arriving, including relevant preparations or equipment. | S1 |
| SW-34 | Include information about why the scenario was activated. | S1, S3 |
| SW-35 | Show when the new scenario operation is actually established. | S3 |
| SW-36 | Receive relevant operational information even when not directly involved in a scenario. | S2, S3 |
| SW-37 | Receive information about travel guarantee when relevant. | S2 |
| SW-38 | Keep detailed task descriptions available without making them the main focus of the overview. | S2 |

### Context

The participants had slightly different needs regarding task descriptions.

S1 wanted to be able to prepare for the task while travelling to the station.

Depending on the task, this could involve putting on a safety vest, finding tools or preparing other equipment.

Having a more precise description available before arrival would allow the steward to make these preparations rather than first discovering what is needed after checking in.

S2 explained that experienced stewards often already know what their general tasks involve.

S3 wanted more context about what had caused the scenario.

We should therefore consider the difference between general task descriptions and information specific to the current assignment.

The steward should be able to quickly understand what they need to do, what they need to bring and whether there is anything they should prepare before arriving.

More detailed general instructions should still be available when needed.

Source references:

- S1 after-interview, 09:45–10:06 and 13:13–14:56.
- S2 usability test and after-interview.
- S3 Kultorvet, 07:20–09:08.
- S3 Kultorvet 2, 07:29–08:38.
- Test team notes.

## Accessibility and interaction

| ID | Feedback | Participant |
| --- | --- | --- |
| SW-39 | Make the confirmation button describe what is being confirmed. | S3 |
| SW-40 | Reduce the need to take off gloves and interact with the phone. | S1 |
| SW-41 | Take different reading and visual abilities into consideration, including dyslexia. | S1, S3 |
| SW-42 | Avoid unnecessary text and interactions when the relevant information is already known. | S2 |

These are particularly relevant because the application is intended to be used while the stewards are working, moving around the Metro and helping passengers.

We should not assume that all employees interact with the phone in the same way or that they can always give the application their full attention.

Source references:

- S1 Forsøg 1, 08:07–09:29.
- S1 after-interview, 10:39–10:57 and 16:12–17:08.
- S2 before-interview and usability test.
- S3 Nørreport, 05:46–06:07.

## Suggestions from the test team

The following suggestions came from our own discussions and notes during the usability test.

They are based on the working conditions, feedback and problems described by the stewards, but should not all be interpreted as functionality explicitly requested by the participants.

### TEAM-01 – Distinct alarms at scenario start and end

The application should make it clear when a scenario starts and ends, even when the steward is not actively looking at the phone.

A distinct alarm or sound for each event could reduce the risk of the steward missing important changes.

The alarm behaviour should be tested with Metro's actual work phones.

Related feedback: SW-01, SW-02, SW-03 and SW-06.

### TEAM-02 – Associate steward accounts with working zones

Stewards already work within different geographical areas.

One possibility would be to associate each steward account with the zone or zones they normally work in.

When a scenario is activated, the application could use this information to show or prioritise relevant nearby stations that require staffing.

This would reduce the amount of information the steward needs to go through when deciding where to go.

It would also make the application more relevant to the individual steward without requiring a completely different interface for each working area.

We need to clarify:

- How steward zones are currently defined.
- Whether a steward can belong to multiple zones.
- Whether zones change between shifts.
- Who should be responsible for configuring them.
- How to handle stewards working outside their usual area.
- How to determine which station is nearest.
- How to handle situations where help is needed outside the steward's zone.

Related feedback: SW-07, SW-14, SW-15 and SW-22.

### TEAM-03 – Only show stations requiring staffing in the assignment view

The main purpose of the station selection view is to help stewards find where their help is needed.

Stations that are affected by a scenario do not necessarily all require staffing.

We could therefore limit the main assignment view to stations that still need stewards.

This could be combined with zone-based filtering so that the steward is primarily shown relevant stations within their working area.

Once the required staffing has been reserved, the station should no longer appear as an available assignment unless additional staffing is requested.

The wider scenario overview could remain accessible separately, and the steward's own current assignment should remain visible.

Related feedback: SW-07, SW-10, SW-11, SW-15 and SW-16.

### TEAM-04 – Prevent duplicate station reservations

If a station requires one steward, multiple stewards should not be able to unintentionally reserve the same assignment.

The staffing requirement should take into account both those who have arrived and those who are on their way.

The system should handle simultaneous selections consistently so that two stewards cannot both be given the same remaining assignment.

Additional staffing should be handled through a separate, agreed workflow if Metro needs this functionality.

Related feedback: SW-15, SW-16 and SW-17.

### TEAM-05 – Provide a microphone for speech-to-text

Dyslexia was brought up during the discussion about chat.

We should investigate adding or exposing a microphone function that allows stewards to dictate messages rather than having to type them manually.

The message should remain editable before it is sent.

We should first check whether the existing keyboard functionality on Metro's devices already supports this.

Related feedback: SW-28 and SW-41.

### TEAM-06 – Confirmation sound for check-in

Checking in should provide an additional confirmation sound once the status change has been successfully registered.

This would allow the steward to recognise that the action was completed without having to spend additional time looking at the screen.

A separate sound for checkout could make the two actions easier to distinguish.

Related feedback: SW-04 and SW-39.

### TEAM-07 – More precise task descriptions before arrival

The steward should be able to access information about their task before reaching the assigned station.

This should include any relevant preparations or equipment needed for that particular task.

For example, knowing that a safety vest or specific tools are needed would allow the steward to prepare while travelling.

Related feedback: SW-33, SW-34 and SW-38.

## Feedback outside the current scope

The interviews also included feedback about other parts of the Metro's existing systems.

| Feedback | Participant |
| --- | --- |
| More accurate passenger display information during disruptions. | S1 |
| Larger and more readable text on passenger displays. | S1 |
| English labelling of Copenhagen Airport. | S1 |
| Better coordination of simultaneous announcements on trains and stations. | S1 |
| Information about equipment such as ticket machines, elevators and escalators. | S1, S3 notes |
| Information about multiple concurrent scenarios. | S2 |
| A longer pilot period before relying on the application in operation. | S1 |

These are included because they came up during the interviews and provide context for the Metro's working environment.

They should not automatically be added to our development scope.

## Suggested priorities

### Address within the current functionality

- Prevent duplicate station reservations and check-ins.
- Correct misleading station coverage information.
- Make scenario start and end notifications more noticeable.
- Show stations requiring staffing more clearly.
- Provide access to more precise task information before arrival.
- Improve chat discoverability.
- Provide clearer confirmation of check-in and checkout.

### Discuss with the Product Owner

- Associating steward accounts with geographical working zones.
- Prioritising nearby stations based on the steward's working zone.
- Supporting speech-to-text in the chat.
- Flexible staffing requirements.
- Expected arrival information.
- Assignments to shuttle trains.
- Direct communication and PIO involvement.
- Operational readiness as a scenario state.

### Potential future development

- General operational overview.
- Information across multiple Metro lines and areas.
- Support for simultaneous scenarios.
- Integration with other operational information systems.

These are our suggested priorities based on the feedback and our observations, not priorities that have been agreed with the Product Owner.
