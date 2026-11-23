# Sprint 5 review · Slides and speaker notes

**Groups 7, 9 and 10, Case A**

**Review date:** Monday 23 November 2026

**Presenters:** Andreas opens with the app overview and the live demo. Kenneth presents the PBIs. Kathrine presents the usability test plan and what comes next.

**Slot:** 40 minutes. Andreas 4 minutes plus a 12 minute demo, Kenneth 10 minutes and Kathrine 7 minutes. The rest is open discussion.

Each slide below has two parts:

- **On the slide** is the text and visuals the audience sees. The Open Design prompt (`sprint-5-review-open-design-prompt.md`) contains the same text.
- **Speaker notes** is what the presenter says. It is not shown on the slide.

Status marks are fixed as of the review day. ✓ means the criterion is met, ○ means it is not met yet. If a status changes before Monday, update it here and in the prompt.

The images are in `docs/screenshots/sprint-5-review/`. The script in that folder captures them again. Open Design gets screenshots with the synthetic DEMO scenarios. The screenshots with real Metro data replace them only after the deck has been exported.

---

# Part 1 · Andreas

## Slide 1 · Title

**On the slide**

- Title: Sprint 5 review
- Subtitle: Emergency scenarios for Metro Service
- Line: Groups 7, 9 and 10 · Aalborg University Copenhagen · 23 November 2026
- Logos: Metroselskabet logo and AAU logo

**Speaker notes** (15 s)

Welcome to the sprint 5 review. I will start with a short overview of what has changed in the app. Then Carsten gets to try it himself. After that, Kenneth goes through the PBIs, and Kathrine ends with the usability test plan and what comes next.

## Slide 2 · Agenda

**On the slide**

1. App overview · Andreas
2. Live demo with Carsten · Andreas
3. This sprint · Kenneth
4. Usability test and up next · Kathrine
5. Discussion

**Speaker notes** (15 s)

This is the plan for today. We have put the questions for you on the slide of the PBI they belong to, so we can discuss them as we go.

## Slide 3 · Sprint goal

**On the slide**

- Label: SPRINT 5 GOAL
- Goal: Finish the remaining MVP functionality and integrate it end to end, so we are ready to run a usability test.
- Label: CHANGES WE CHOSE TO MAKE
  1. 016 and 017 are replaced by 029 Station chat, based on your feedback at the last review.
  2. 013 is merged into the revised station status flow in 015.
  3. 030 Admin dashboard is a new PBI that we created.

**Speaker notes** (60 s)

Our goal for this sprint was to finish the remaining MVP functionality, especially in the steward app, and to make the frontend and backend work together as one system. That way we can run a real usability test.

We also took ownership of the backlog. When your feedback or our own work showed that a PBI no longer fit, we changed it. The biggest change is that 016 and 017, sending and acknowledging instructions, are replaced by a station chat, 029. That came from your feedback last time, that messages which are not urgent should not go over the radio. Kenneth will go through it. We also merged 013 into the revised station status flow, and we created a new PBI for an admin dashboard, which Kathrine will talk about.

## Slide 4 · What changed · Operator

**On the slide**

- Heading: The operator screen
- Two screenshots side by side:
  - `op-1-pick.png`, caption: Picking a scenario
  - `op-2-active.png`, caption: Scenario active

**Speaker notes** (75 s)

This is the operator screen as it looks now. The layout has three columns. On the left you pick a scenario, either from the list or by describing the incident in text. The map is in the middle. On the right is the action card with START and STOP.

The list only shows scenarios for the operator's own line group, M1/M2 or M3/M4. The line-group switch is in the top bar. The scenario list can be searched by name or by station, and each scenario shows its route under the name.

On the right, you can see the scenario is active. The map now colours each required station green, yellow or red, depending on whether it has enough stewards. The map zooms to the active scenario, and it is drawn from the real network in the database instead of mock data. There is also a new login screen in the Metro style.

## Slide 5 · What changed · Steward

**On the slide**

- Heading: The steward app
- Three phone screenshots side by side:
  - `st-1-on-the-way.png`, caption: On the way
  - `st-2-station-tasks.png`, caption: Station tasks
  - `st-3-chat.png`, caption: Station chat

**Speaker notes** (75 s)

This is the steward app. It now uses the Metro look, with the exact line colours and the Metro arrows on the slide buttons.

Everything about the steward's current job is in one status card: the station, the status, the scenario and a small map. The card changes colour when the status changes. The app follows the server's status, so a steward who restarts the phone is back where they were. Going on the way also works without a connection, because the report is saved on the phone and sent when the connection is back.

After check-in, the lower half shows that station's own tasks. Check-out takes two steps, so you cannot do it by accident. And once checked in, the steward gets a chat tab on the right edge to write to the control room.

The last PRs for 019 and 029 were merged this weekend. They add live delivery of chat messages, real answers in the suggestion box and offline chat messages. So what Carsten tries in a moment is the complete flow.

## Slide 6 · Live demo

**On the slide**

- Heading only: Live demo
- Small line: Carsten tries the operator and the steward app

**Speaker notes** (12 min)

Now we would like you to try it yourself, Carsten. We will give you a short task as an operator and one as a steward, and we ask you to think aloud while you do it. We are testing the app, not you, so anything that is unclear is useful for us.

Before the review, check that:

- Staging runs the build from `dev` with all 019 and 029 PRs merged.
- An operator account and a steward account are logged in, one on a laptop and one on a phone.
- A screen recording of the same flow is ready as a backup in case the network fails.

If the suggestion endpoint or live chat is not on staging on Monday, use "Vælg fra liste" for the operator task and leave the chat out of the steward task.

---

# Part 2 · Kenneth

Each PBI slide has a small "PBI 0XX · title" label, a short heading, one visual, three numbered steps of one line each and the acceptance criteria in a small strip. Each PBI slide also has a status tag in the corner, **Done** or **In progress**. Questions for Carsten are in a small box on the slide, or on their own slide when there are more than three.

The acceptance criteria are copied word for word from the GitHub issues (#6, #18, #19, #331).

## Slide 7 · This sprint

**On the slide**

Six cards, each with a status tag:

- PBI 006 · Offline reports · Done
- PBI 018 · Notifications · In progress
- PBI 019 · Scenario suggestions · Done
- PBI 027 · Usability test plan · Done
- PBI 029 · Station chat, replaces 016 and 017 · Done
- PBI 030 · Admin dashboard · In progress

**Speaker notes** (40 s)

These are the six PBIs we worked on this sprint. Four are done and two are in progress. I will go through 006, 018, 019 and 029. Kathrine takes 027, the usability test plan, and 030, the admin dashboard.

## Slide 8 · PBI 006 · Offline reports

**On the slide**

- Tag: Done
- Heading: No lost reports and no duplicates
- Visual: a 3-step mock-up, labelled "Mock-up". Connected, then Offline and saved, then Back online and sent once. Use `006-1-offline-queued.png` as the phone screen if it exists, otherwise `st-1-on-the-way.png`.
- Steps:
  - **01 · Offline:** The phone saves the report.
  - **02 · Back online:** The phone sends the saved report automatically.
  - **03 · Exactly once:** The control room never sees the same report twice.
- Acceptance criteria (issue #6):
  - ✓ Position and status reports made with no connection are queued locally and survive an application restart.
  - ✓ On reconnection the client reconciles to the current server scenario within 5 seconds without user action.
  - ✓ Each queued report is applied server-side exactly once, verified by a test that replays the same queue twice.
  - ✓ If the scenario changed while the client was offline, queued reports against the superseded scenario are rejected and the steward is told why.
  - ✓ Conflict resolution rules are recorded in an architecture decision record.

**Speaker notes** (60 s)

Stations underground often have no connection. With 006, a steward can report position and status without a connection. The phone saves the report and sends it automatically when the connection is back. The server applies each report exactly once, so the control room never sees duplicates. We test that by sending the same queue twice. If the scenario was stopped or switched while the steward was offline, the report is rejected and the app tells the steward why.

## Slide 9 · PBI 018 · Notifications

**On the slide**

- Tag: In progress
- What's left: The ADR is done (#412). The scenario start and end notification is coded but not yet tested on a phone (#413). The chat notification is not started (#414).
- Heading: The phone tells you, even when it's in your pocket
- Visual: mock-up, labelled "Mock-up". A locked phone with a notification banner "Scenarie aktiveret", and "Ny besked på Nørreport" underneath.
- Steps:
  - **01 · Scenario starts:** The steward gets a notification.
  - **02 · Scenario ends:** The steward gets a notification.
  - **03 · New message:** Stewards who have checked in at the station get a notification.
- Acceptance criteria (issue #18):
  - ✓ The delivery channel is chosen, and the alternatives and the reason for the choice are recorded in an architecture decision record.
  - ○ The steward receives a visible notification when a scenario starts and when it ends, also when the application is in the background.
  - ○ The steward receives a visible notification when a message is sent to the chat of the station they are checked in at (MET-A-029).
  - ○ Behavior when the device has no connection at send time is specified and tested.
  - ○ Any dependency on a third-party service is named, together with what happens when it is unavailable.
- Question for Carsten: Would notifications on the steward's phone be useful when a scenario starts, ends, or when a new message arrives for their station? Are there other situations where a notification would help more?

**Speaker notes** (60 s)

018 is about notifications on the steward's phone, also when the phone is in a pocket. We have chosen how to deliver them and written it down in an ADR. The notification when a scenario starts and ends is coded but not tested on a real phone yet, and the chat notification is not started. So this one continues next sprint.

Carsten, we would like to know whether these are the right moments to notify a steward, or whether other situations matter more.

## Slide 10 · PBI 019 · Scenario suggestions

**On the slide**

- Tag: Done
- Heading: Describe the incident. Get a suggestion.
- Visual: three crops of the left column, without the map:
  - `019-1-suggestion-crop.png`: the text box and the suggestions
  - `019-2-no-confident-crop.png`: "Ingen sikre forslag"
  - `019-3-preview-crop.png`: the preview
- Steps:
  - **01 · Describe:** The operator writes where: stations and track, for example "Forum - Kongens Nytorv spor 1", in the "Beskriv hændelse" tab next to "Vælg fra liste".
  - **02 · Match:** The system finds the stations and the track in the text and ranks the operator's own scenarios. It suggests up to 5, or says "Ingen sikre forslag" and shows the full list.
  - **03 · Confirm:** A suggestion only selects the scenario. Starting it still takes START and the confirmation.
- Acceptance criteria (issue #19):
  - ✓ A deterministic method maps a free-text description to a ranked shortlist of at most five candidate scenarios.
  - ✓ The method is exposed behind an interface that permits a second implementation to be swapped in without changing callers.
  - ✓ A suggested scenario is never activated without the explicit confirmation required by A-007.
  - ✓ When no candidate exceeds the agreed confidence threshold, the operator is told so and offered the full list instead of a poor ranking.
  - ✓ The approach, its assumptions and its known failure modes are documented
  - ○ The method is compared with a station filter on a self-labelled set, reproducible from one command, and the result and its limitations are documented.

**Speaker notes** (75 s)

019 lets the operator describe the incident in text instead of searching the list. The operator writes where it is, for example the stations and the track. The system finds the stations and the track in the text and ranks the operator's own scenarios. It shows up to five suggestions. If none of them is a good enough match, it says so and shows the full list, instead of a poor guess. A suggestion only selects the scenario. Starting it still takes START and the confirmation, so nothing starts by accident.

## Slide 11 · PBI 019 · What we learned

**On the slide**

Left card, label WHAT WE LEARNED:

- Heading: It finds where, not what
1. In practice, the search only uses the stations and the track number. In "Signalfejl mellem Kongens Nytorv og Christianshavn spor 2", only the two stations and "spor 2" are used. "Signalfejl" is ignored, because the scenarios don't record what kind of problem they cover. The limit is the data, and possibly how scenarios are defined.
2. **Known weaknesses.** Station codes in lowercase and everyday names like "Hovedbanegården" aren't recognised, and vague text like "Spor 1" can score high.

Right card, label QUESTIONS FOR CARSTEN:

1. How does an operator pick a scenario on M1/M2, and how is that different on M3/M4, where they pick the problem?
2. On the same stretch and track, can different problems, for example a signal fault or a power failure, need different scenarios?
3. Is the free-text box mainly useful for M3/M4, where operators start from the problem?

**Speaker notes** (60 s)

The main thing we learned is that the search finds where, not what. It only uses the stations and the track number, because the scenarios don't say what kind of problem they cover. So "signal fault" in the text makes no difference. That is a limit of the data, and maybe of how scenarios are defined. We also know it misses lowercase station codes and everyday names like "Hovedbanegården".

That leads to three questions for you, Carsten.

## Slide 12 · PBI 019 · How operators find a scenario

**On the slide**

- Heading: Questions for Carsten
- Three grouped cards:
  - **01 · WHEN AN INCIDENT HAPPENS**
    - How does an operator first receive information about an incident? Which systems or channels are involved, and what information is available at that point?
    - How does an operator decide which fallback scenario fits? Is it mainly the type of incident, the affected stations, the track sections or something else?
  - **02 · HOW SCENARIOS ARE FOUND**
    - How are fallback scenarios named and organised today? Do operators know them by name or number, or do they search from the incident?
    - What would feel most natural when searching: the scenario name, a text description of the incident, selecting a station or track section on the map, or a combination?
    - Would selecting an affected area on the map and getting a list of matching scenarios be a useful alternative to text search?
  - **03 · BEFORE STARTING IT**
    - What does an operator need to see about a suggested scenario before feeling confident enough to start it?

**Speaker notes** (60 s)

These questions decide where we take 019 next. Today the suggestion works from text. We want to know how an operator actually gets the first information about an incident, and how they choose a scenario from it. If operators think in terms of a place on the map, selecting the area on the map might work better than typing. We also want to know what an operator must see before they trust a suggestion enough to start it.

We will note your answers and turn them into issues, so please answer as briefly or as fully as you like.

## Slide 13 · PBI 029 replaces 016 and 017

**On the slide**

- Heading: One chat instead of instructions and acknowledgements
- Lead line, in italics: We create new features from your feedback and from what we discover. 029 comes from the sprint 4 review.
- Visual: the cards for 016 "Send an instruction" (Replaced) and 017 "Acknowledge the instruction" (Dropped) are crossed out. An arrow points from them to the card for 029 "Station chat" (New this sprint).
- Steps:
  - **01 · From the last review:** Messages that are not urgent should not go over the radio.
  - **02 · The chat belongs to the station:** The operator writes to "Nørreport", not to a single person.
  - **03 · Nothing left to acknowledge:** 017 depended on 016, so we dropped it.

**Speaker notes** (45 s)

This is an example of us taking ownership of the backlog. At the last review, you told us that messages which are not urgent should not go over the radio. 016 was about sending an instruction to a steward, and 017 about acknowledging it. Instead, we made a chat that belongs to the station. The operator writes to Nørreport, not to one person, so whoever is checked in there sees it. Since 017 depended on 016, we dropped it.

## Slide 14 · PBI 029 · Station chat

**On the slide**

- Tag: Done
- Heading: Messages that are not urgent, without the radio
- Visual: steward phone `029-1-steward-sent.png` next to the operator screen `029-2-operator-reply.png`, with `029-3-steward-reply.png` as the result. Small inset: `029-4-offline-pending.png` showing "Afventer" while offline.
- Steps:
  - **01 · Check in:** Only a steward who has checked in at the station can open its chat.
  - **02 · Write:** The message is shown as coming from the station, not from the steward.
  - **03 · Answer:** The operator answers, and every steward at the station sees the answer.
- Acceptance criteria strip (issue #331), short labels only: ✓ Access · ✓ Messages · ✓ Operator · ○ Unanswered first · ✓ Lifetime · ✓ Offline · ✓ Incident log
- Question for Carsten: How do stewards receive their assignments and instructions today, and how do they find out which scenario applies to them? What do they need to know immediately, and what can wait?

**Speaker notes** (75 s)

This is the station chat. Only a steward who is checked in at the station can open it. When they write, the operator sees the message as coming from the station, not from the person. The operator has a messages panel with every station's chat and can reply, or write first. Every steward at that station sees the reply, also someone who checks in later. If the steward has no connection, the message shows "Afventer" and is sent when the connection is back.

The one criterion we have not met is that unanswered threads come first in the operator's list. Right now the newest message is on top.

Carsten, how do stewards get their assignments and instructions today, and what do they need to know right away?

## Slide 15 · PBI 029 · Acceptance criteria

**On the slide**

- Tag: Done
- All seven criteria word for word from issue #331, in two columns, with the same ✓/○ marks as the strip on slide 14:
  - ✓ **Access:** A steward checked in (ARRIVED) at a station can open the station's thread from the main screen in one tap. A steward who is not checked in cannot read or send, and the server rejects the attempt with a message the client can display.
  - ✓ **Messages:** A message is free text, is shown as coming from the station, and shows the time it was written. The steward's identity is not shown to the operator.
  - ✓ **Operator:** An operator can write to any station's thread during an active scenario, as a reply or as the first message. It reaches the stewards checked in at that station within the timings in A-004, with a visible in-app notification, and messages only reach operators in the station's line group (#315).
  - ○ **Unanswered first:** A thread is unanswered from a steward message until an operator replies. Opening it changes nothing. The operator's list shows unanswered threads first, oldest at the top.
  - ✓ **Lifetime:** The thread stays at the station while the scenario is live, so a steward who checks in later sees the earlier messages. At stand-down it is closed and removed from both clients.
  - ✓ **Offline:** A message written without connection is queued, sent once on reconnection (A-006) and shown as pending, and it keeps its original time written.
  - ✓ **Incident log:** Every message writes an event to the incident log (A-023) with the station as the source, the text and both timestamps (written and received by the server), and without the steward's identity.

**Speaker notes** (30 s)

Here are all seven criteria in full, for reference. I won't read them out. Six are met, and the one that is open is the order of the operator's list. Now Kathrine takes over with the usability test.

---

# Part 3 · Kathrine

These slides are rebuilt from Kathrine's deck, with the questions for Carsten added.

## Slide 16 · PBI 027 · Usability test plan

**On the slide**

- Lead text: Proposed session: 1 operator + 3 stewards · 1.5 to 2 hours · simulated fallback scenario
- Three cards:
  - **01 · INTRODUCE.** First introduce the testers to the plan for the day and what they can expect. After this we would like to separate each person and ask preliminary questions.
  - **02 · OBSERVE.** Individual tasks. Operator and stewards complete realistic tasks while thinking aloud. This allows them to look at and try the system before a possible field test.
  - **03 · DISCUSS.** Feedback & improvements. Semistructured individual interviews. Compare with current practices and identify what should change. How did they like the system?
- Small floating card between 01 and 02: **02.1 · FIELD TEST?** Go out in the metro and try the system. Needs more clarification.
- Bottom strip: We are testing the application, not the participants

**Speaker notes** (90 s)

We have planned a usability evaluation of the actual operator and steward workflows. We hope to have one operator and three stewards, using a simulated scenario that cannot affect live operations. The total time available is approximately two hours. We want feedback on whether our plan matches how Metro Service really works.

## Slide 17 · PBI 027 · Proposed test structure

**On the slide**

- Heading: Four parts, within a two-hour session
- Four rows:
  - **01 · Introduction & existing workflows** · 15 to 20 min · Short interview on procedures and pain points. Introduce think-aloud and ask for recording consent.
  - **02 · Individual task-based testing** · 25 to 30 min · Participants work separately: scenario activation, assignment, arrival, station status and messages.
  - **03 · Field test or office simulation** · 20 to 30 min? · Observe use while moving between locations, if travel time permits. Decision needed from Metro.
  - **04 · Semistructured feedback** · 15 to 20 min · Open questions on usability, missing information and differences from current routines.
- Bottom line: Staffing: ideally 2 students per steward, a facilitator and a note-taker or technical support. One or more operator observers.

**Speaker notes** (90 s)

First, around 15 to 20 minutes of introduction and open questions about existing workflows, including consent for any recording. Next, 25 to 30 minutes of individual tasks. We want participants separated so they do not influence one another, and to think aloud while we time tasks and record difficulties. Ideally, two students accompany each steward. One facilitates and keeps the conversation flowing. The other takes notes, tracks times and manages technical issues. One or more students observe the operator. Third, we need Carsten's input on whether travelling out to the Metro is feasible. Finally, 15 to 20 minutes of semistructured feedback. The activities add up to 75 to 100 minutes, before travel and transitions.

## Slide 18 · PBI 027 · For discussion with Metro

**On the slide**

- Heading: Does this work in practice?
- Left card, label MAIN DECISION:
  - Heading: Field test or simulate indoors?
  - With only two hours available, would walking from the Metro Service building to a station leave enough time to test and interview participants? How far apart are the planned test locations?
  - Would a simulation in the office be more realistic to organise?
- Right card, label PRACTICAL CONFIRMATIONS:
  - Heading: What do we need?
  - 1 operator and ideally 3 stewards
  - Separate participants for individual tasks
  - Android phones and operator access
  - Permission for audio recording, with the participants' consent
  - Metro tickets or other access for the students who accompany stewards
  - Any operational, security or confidentiality restrictions: what should we not ask participants to do, observe, record or discuss?
- Bottom line: Our main request: Is the structure realistic, and which workflows or situations would you like us to include?

**Speaker notes** (2 min)

This is the most important discussion point. We have about two hours, and we also want to leave time to interview participants afterwards. Do you think a field test is realistic once we account for travel from the Metro Service office to the stations? Or should we simulate the scenario inside the building? We would also like to confirm an operator, three stewards, separate tasks, access to devices, and whether audio recording is acceptable with the participants' consent. If students go with the stewards into the Metro, do we need tickets or other access? Are there restrictions we should know about, things we should not ask participants to do, observe, record or discuss? And are there specific workflows or situations you would like us to include? Please tell us if the planned tasks do not represent real work.

## Slide 19 · Up next · Started & in progress

**On the slide**

- Heading: Useful additions beyond the core steward workflow
- Left card, label PBI 030 · ADMIN DASHBOARD:
  - Heading: Managing users and scenarios
  - An administration view is being implemented to let authorised administrators manage user accounts and roles, create or edit scenarios, and review relevant activity.
  - This is additional functionality we consider valuable for maintaining and operating the system, even though it is not central to the usability test.
- Right card, label NEXT STEPS:
  - Heading: Implementation & evaluation
  - Continue the admin work
  - Finalise the test setup
  - Run usability evaluation
  - Turn findings into prioritised issues
- Bottom line: Status: PBI 030 is in progress, not presented as completed functionality.

**Speaker notes** (60 s)

Finally, looking ahead, we have also started work on an admin dashboard, PBI 030. It's not part of the core steward usability test, but we think it's valuable. Authorised administrators will be able to manage accounts and roles, create and edit scenarios, and see relevant activity. This is still in progress, not a completed feature. Alongside that, our next steps are finalising the usability setup, conducting the test and turning what we find into issues for subsequent work.

## Slide 20 · PBI 030 · Questions for Carsten

**On the slide**

- Heading: Accounts and access
- Two cards:
  - **01 · LOGIN.** Stewards may sign in through their work phone rather than in each app. How important is it that our app supports the same login? Should we consider that integration for future development?
  - **02 · LINES.** Should operators and stewards only see information for their own Metro lines, or are there situations where they need to see several lines?

**Speaker notes** (60 s)

Since the admin dashboard is where accounts and roles are managed, we have two questions about access. First, stewards may sign in through their work phone instead of in each app. How important is it that our app works with that login, and should we plan for it? Second, today an operator only sees their own line group. Should operators and stewards only see their own lines, or do they sometimes need to see across lines?

That was everything from us. Thank you, and we are happy to take any further questions.
