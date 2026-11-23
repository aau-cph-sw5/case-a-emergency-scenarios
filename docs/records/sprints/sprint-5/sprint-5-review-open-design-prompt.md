# Open Design prompt · Sprint 5 review deck

Paste everything below the line into Open Design. Attach the logos and the screenshots from `docs/screenshots/sprint-5-review/` with the filenames listed under "Assets". The speaker notes are in `sprint-5-review-slides.md` and are left out of this prompt on purpose.

---

Build a 20-slide presentation deck as HTML slides at 1920×1080 (16:9), one slide per page, that exports cleanly to PDF. It is a sprint review for a university software project, AAU Copenhagen groups 7, 9 and 10, presented to the product owner at Metro Service, Carsten. Three people present: slides 1 to 6, slides 7 to 15, and slides 16 to 20.

## Rules

- Use only the text given under "Slides". Do not add, shorten, reword or invent content, statistics or features. Keep Danish UI text exactly as written, for example "Beskriv hændelse", "Vælg fra liste", "Ingen sikre forslag", "Afventer".
- Do not use em dashes or en dashes anywhere. Use "·" as the separator, as in the slide titles below.
- Do not put speaker notes on the slides.
- Status tags and ✓/○ marks are fixed values. Render them exactly as given. They are not interactive.
- Use the attached screenshots as they are. Do not redraw, recolour or crop them unless a slide says "crop". Never fake a screenshot. Where a slide asks for a mock-up, draw a simple flat mock-up in the deck's palette and put a small "Mock-up" label on it.
- No icons, illustrations, stock photos, gradients, drop shadows, glows or decorative shapes beyond what the style guide describes.
- All text must fit inside its slide and card at 1920×1080 with no overflow and no text under 22px.

## Style guide

The style copies an existing deck by one of the presenters. Match it closely: plain, flat, white, with Metro red bars at the top and bottom.

### Canvas and grid

- Slide: 1920×1080, background #FFFFFF.
- Side margins: 110px left and right. Content area: from y 180px to y 950px.
- Gaps between cards: 32px.

### Colours

| Token | Hex | Use |
|---|---|---|
| Red | #E90035 | Header bar, footer bar, card labels, step numbers, "In progress" tag outline |
| Ink | #1C252E | Subheadings, card headings, bold callouts, "Done" tag fill, ✓ marks |
| Grey | #59656E | Body text, captions, ○ marks |
| Card | #F3F5F7 | Card and strip backgrounds |
| White | #FFFFFF | Slide background, text on red |
| Hairline | #E1E5E9 | 1px border around screenshots only |

Use no other colours, except inside the screenshots.

### Type

- Font: Arial, with Helvetica and sans-serif as fallbacks. One family for everything.
- Slide title: 52px, regular weight, white, in the header bar.
- Slide subheading, the lead line under the header: 48px, bold, Ink.
- Card label: 22px, bold, uppercase, Red, letter-spacing 0.04em. Format "01 · INTRODUCE" or "MAIN DECISION".
- Card heading: 36px, bold, Ink.
- Body: 26px, regular, Grey, line-height 1.35. Bullets are plain "•" in Grey.
- Step number in rows, "01", "02": 36px, bold, Red.
- Callout strip text: 32px, bold, Ink.
- Small meta text, times and captions: 22 to 24px, Grey.
- Slide number: 34px, white, right-aligned in the footer.

### Fixed frame on every slide except slide 1

- Header bar: full width, 150px high, Red, at the top. The slide title sits on it in white, left-aligned at x 100px and vertically centred.
- Footer bar: full width, 84px high, Red, at the bottom (y 996 to 1080). The white AAU logo (`aau-logo-white.png`) sits at the left, x 48px, 60px high. The slide number is at the right, 60px from the edge.

### Components

- **Card:** a #F3F5F7 rounded rectangle, 16px corner radius, no border, no shadow, 32px padding. Content order: label, heading, body.
- **Callout strip:** a full-width card, 100px high, with one line of callout text. Used at the bottom of a slide.
- **Row list:** full-width cards, 130px high, stacked with a 14px gap. Each row has a step number on the left, then a title with a time or meta line under it, then body text on the right.
- **Status tag:** a pill at the top right of the content area, just under the header bar. 22px bold uppercase text, 8px by 20px padding, full radius. DONE is white text on an Ink fill. IN PROGRESS is Red text with a 2px Red outline on white. When a "What's left" line is given, show it right under the tag in 22px Grey, at most 2 lines.
- **Steps:** three numbered items in a column or row. "01 · Title" in Red bold label style, then one line of body text.
- **Acceptance-criteria strip:** a card at the bottom of PBI slides with the label "ACCEPTANCE CRITERIA (ISSUE #N)". Each criterion is a line starting with ✓ in Ink or ○ in Grey. When the criteria don't fit at 22px, use two columns.
- **Questions box:** a card with the label "QUESTIONS FOR CARSTEN" and the questions as a numbered list in body style.
- **Screenshot:** the image with 12px corner radius and a 1px Hairline border, on white. No device frames. The caption sits 12px under the image, 24px Grey, centred.
- **Overview card:** a card with the "PBI 0XX" label, the title as the card heading and the status tag inside the card at the top right.

## Assets

Logos (attached):

- `aau-logo-white.png`: white AAU logo for the red footer bar
- `metro-logo.png`: Metroselskabet logo, used on slide 1 only

Screenshots (attached):

| File | Shows |
|---|---|
| `op-1-pick.png` | Operator web app, picking a scenario |
| `op-2-active.png` | Operator web app, scenario active with coverage colours |
| `st-1-on-the-way.png` | Steward phone, on the way to a station |
| `st-2-station-tasks.png` | Steward phone, station tasks after check-in |
| `st-3-chat.png` | Steward phone, station chat |
| `006-1-offline-queued.png` | Steward phone, report saved offline (may be missing, see slide 8) |
| `019-1-suggestion-crop.png` | Operator, text box with suggestions |
| `019-2-no-confident-crop.png` | Operator, "Ingen sikre forslag" |
| `019-3-preview-crop.png` | Operator, preview of a suggested scenario |
| `029-1-steward-sent.png` | Steward phone, message sent |
| `029-2-operator-reply.png` | Operator messages panel with a reply |
| `029-3-steward-reply.png` | Steward phone, sees the reply |
| `029-4-offline-pending.png` | Steward phone, "Afventer" while offline |

## Slides

### Slide 1 · Title

The only slide without the header and footer frame. White background. A Red block covers the left 40% of the slide, from top to bottom, with the white AAU logo at the bottom left of the block. On the right, on white:

- Metroselskabet logo, 80px high
- Title, 96px bold Ink: Sprint 5 review
- Subtitle, 40px Grey: Emergency scenarios for Metro Service
- Line, 26px Grey: Groups 7, 9 and 10 · Aalborg University Copenhagen · 23 November 2026

### Slide 2 · Agenda

Title: Agenda

Five row-list rows, each with a number and a presenter in meta text:

1. App overview · Andreas
2. Live demo with Carsten · Andreas
3. This sprint · Kenneth
4. Usability test and up next · Kathrine
5. Discussion

### Slide 3 · Sprint goal

Title: Sprint 5 · Goal and changes

A full-width card at the top:

- Label: SPRINT 5 GOAL
- Heading, 40px: Finish the remaining MVP functionality and integrate it end to end, so we are ready to run a usability test.

Below it, three cards in a row under the shared label "CHANGES WE CHOSE TO MAKE", placed above the cards:

- **01** · 016 and 017 are replaced by 029 Station chat, based on your feedback at the last review.
- **02** · 013 is merged into the revised station status flow in 015.
- **03** · 030 Admin dashboard is a new PBI that we created.

### Slide 4 · What changed · Operator

Title: What changed · Operator

Subheading: The operator screen

Two screenshots side by side, equal width, filling the content area:

- `op-1-pick.png`, caption "Picking a scenario"
- `op-2-active.png`, caption "Scenario active"

No other text.

### Slide 5 · What changed · Steward

Title: What changed · Steward

Subheading: The steward app

Three phone screenshots side by side, equal height, as tall as the content area allows, centred:

- `st-1-on-the-way.png`, caption "On the way"
- `st-2-station-tasks.png`, caption "Station tasks"
- `st-3-chat.png`, caption "Station chat"

No other text.

### Slide 6 · Live demo

A section slide. Keep the header and footer, with an empty title in the header bar. Centred in the content area:

- 120px bold Ink: Live demo
- 32px Grey: Carsten tries the operator and the steward app

### Slide 7 · This sprint

Title: This sprint

Six overview cards in a 3×2 grid:

| PBI | Title | Tag |
|---|---|---|
| PBI 006 | Offline reports | DONE |
| PBI 018 | Notifications | IN PROGRESS |
| PBI 019 | Scenario suggestions | DONE |
| PBI 027 | Usability test plan | DONE |
| PBI 029 | Station chat · replaces 016 and 017 | DONE |
| PBI 030 | Admin dashboard | IN PROGRESS |

### Slide 8 · PBI 006

Title: PBI 006 · Offline reports

Tag: DONE

Subheading: No lost reports and no duplicates

Visual on the left half: a 3-step mock-up with the "Mock-up" label, three small panels joined by arrows. The panels are "Connected", then "Offline and saved", then "Back online and sent once". The phone screen in the middle panel is `006-1-offline-queued.png`. If that file is not attached, use `st-1-on-the-way.png` instead.

Steps on the right half:

- **01 · Offline:** The phone saves the report.
- **02 · Back online:** The phone sends the saved report automatically.
- **03 · Exactly once:** The control room never sees the same report twice.

Acceptance criteria strip (issue #6):

- ✓ Position and status reports made with no connection are queued locally and survive an application restart.
- ✓ On reconnection the client reconciles to the current server scenario within 5 seconds without user action.
- ✓ Each queued report is applied server-side exactly once, verified by a test that replays the same queue twice.
- ✓ If the scenario changed while the client was offline, queued reports against the superseded scenario are rejected and the steward is told why.
- ✓ Conflict resolution rules are recorded in an architecture decision record.

### Slide 9 · PBI 018

Title: PBI 018 · Notifications

Tag: IN PROGRESS

What's left: The ADR is done (#412). The scenario start and end notification is coded but not yet tested on a phone (#413). The chat notification is not started (#414).

Subheading: The phone tells you, even when it's in your pocket

Visual on the left: a mock-up with the "Mock-up" label. It shows a locked phone with a notification banner "Scenarie aktiveret", and a second banner "Ny besked på Nørreport" underneath.

Steps on the right:

- **01 · Scenario starts:** The steward gets a notification.
- **02 · Scenario ends:** The steward gets a notification.
- **03 · New message:** Stewards who have checked in at the station get a notification.

Questions box, one question: Would notifications on the steward's phone be useful when a scenario starts, ends, or when a new message arrives for their station? Are there other situations where a notification would help more?

Acceptance criteria strip (issue #18):

- ✓ The delivery channel is chosen, and the alternatives and the reason for the choice are recorded in an architecture decision record.
- ○ The steward receives a visible notification when a scenario starts and when it ends, also when the application is in the background.
- ○ The steward receives a visible notification when a message is sent to the chat of the station they are checked in at (MET-A-029).
- ○ Behavior when the device has no connection at send time is specified and tested.
- ○ Any dependency on a third-party service is named, together with what happens when it is unavailable.

### Slide 10 · PBI 019

Title: PBI 019 · Scenario suggestions

Tag: DONE

Subheading: Describe the incident. Get a suggestion.

Visual: the three crops side by side, each with a caption:

- `019-1-suggestion-crop.png`, caption "Suggestions"
- `019-2-no-confident-crop.png`, caption "Ingen sikre forslag"
- `019-3-preview-crop.png`, caption "Preview"

Steps:

- **01 · Describe:** The operator writes where: stations and track, for example "Forum - Kongens Nytorv spor 1", in the "Beskriv hændelse" tab next to "Vælg fra liste".
- **02 · Match:** The system finds the stations and the track in the text and ranks the operator's own scenarios. It suggests up to 5, or says "Ingen sikre forslag" and shows the full list.
- **03 · Confirm:** A suggestion only selects the scenario. Starting it still takes START and the confirmation.

Acceptance criteria strip (issue #19):

- ✓ A deterministic method maps a free-text description to a ranked shortlist of at most five candidate scenarios.
- ✓ The method is exposed behind an interface that permits a second implementation to be swapped in without changing callers.
- ✓ A suggested scenario is never activated without the explicit confirmation required by A-007.
- ✓ When no candidate exceeds the agreed confidence threshold, the operator is told so and offered the full list instead of a poor ranking.
- ✓ The approach, its assumptions and its known failure modes are documented
- ○ The method is compared with a station filter on a self-labelled set, reproducible from one command, and the result and its limitations are documented.

### Slide 11 · PBI 019 · What we learned

Title: PBI 019 · What we learned

Two cards side by side.

Left card:

- Label: WHAT WE LEARNED
- Heading: It finds where, not what
- 1. In practice, the search only uses the stations and the track number. In "Signalfejl mellem Kongens Nytorv og Christianshavn spor 2", only the two stations and "spor 2" are used. "Signalfejl" is ignored, because the scenarios don't record what kind of problem they cover. The limit is the data, and possibly how scenarios are defined.
- 2. Known weaknesses. Station codes in lowercase and everyday names like "Hovedbanegården" aren't recognised, and vague text like "Spor 1" can score high.

Right card, as a questions box:

1. How does an operator pick a scenario on M1/M2, and how is that different on M3/M4, where they pick the problem?
2. On the same stretch and track, can different problems, for example a signal fault or a power failure, need different scenarios?
3. Is the free-text box mainly useful for M3/M4, where operators start from the problem?

### Slide 12 · PBI 019 · Questions

Title: PBI 019 · How operators find a scenario

Subheading: Questions for Carsten

Three cards in a row:

**01 · WHEN AN INCIDENT HAPPENS**

- How does an operator first receive information about an incident? Which systems or channels are involved, and what information is available at that point?
- How does an operator decide which fallback scenario fits? Is it mainly the type of incident, the affected stations, the track sections or something else?

**02 · HOW SCENARIOS ARE FOUND**

- How are fallback scenarios named and organised today? Do operators know them by name or number, or do they search from the incident?
- What would feel most natural when searching: the scenario name, a text description of the incident, selecting a station or track section on the map, or a combination?
- Would selecting an affected area on the map and getting a list of matching scenarios be a useful alternative to text search?

**03 · BEFORE STARTING IT**

- What does an operator need to see about a suggested scenario before feeling confident enough to start it?

### Slide 13 · PBI 029 replaces 016 and 017

Title: PBI 029 replaces 016 and 017

Subheading: One chat instead of instructions and acknowledgements

Lead line, 26px italic Grey: We create new features from your feedback and from what we discover. 029 comes from the sprint 4 review.

Visual: two cards on the left, crossed out with a 3px Grey diagonal line:

- "016 · Send an instruction", with a small "REPLACED" label
- "017 · Acknowledge the instruction", with a small "DROPPED" label

A Red arrow points from them to a card on the right, "029 · Station chat", with a "NEW THIS SPRINT" label. That card has a 3px Red outline.

Steps below the visual:

- **01 · From the last review:** Messages that are not urgent should not go over the radio.
- **02 · The chat belongs to the station:** The operator writes to "Nørreport", not to a single person.
- **03 · Nothing left to acknowledge:** 017 depended on 016, so we dropped it.

### Slide 14 · PBI 029

Title: PBI 029 · Station chat

Tag: DONE

Subheading: Messages that are not urgent, without the radio

Visual:

- The steward phone `029-1-steward-sent.png` on the left.
- The operator screen `029-2-operator-reply.png` in the middle, larger.
- The steward phone `029-3-steward-reply.png` on the right, as the result.
- Arrows join the three images left to right.
- A small inset of `029-4-offline-pending.png`, with the caption "Afventer while offline".

Steps:

- **01 · Check in:** Only a steward who has checked in at the station can open its chat.
- **02 · Write:** The message is shown as coming from the station, not from the steward.
- **03 · Answer:** The operator answers, and every steward at the station sees the answer.

Questions box, one question: How do stewards receive their assignments and instructions today, and how do they find out which scenario applies to them? What do they need to know immediately, and what can wait?

Acceptance criteria strip (issue #331), short labels only, on one line: ✓ Access · ✓ Messages · ✓ Operator · ○ Unanswered first · ✓ Lifetime · ✓ Offline · ✓ Incident log

### Slide 15 · PBI 029 · Acceptance criteria

Title: PBI 029 · Acceptance criteria

Tag: DONE

All seven criteria in two columns, each in its own small card, with the same ✓/○ marks as slide 14:

- ✓ **Access:** A steward checked in (ARRIVED) at a station can open the station's thread from the main screen in one tap. A steward who is not checked in cannot read or send, and the server rejects the attempt with a message the client can display.
- ✓ **Messages:** A message is free text, is shown as coming from the station, and shows the time it was written. The steward's identity is not shown to the operator.
- ✓ **Operator:** An operator can write to any station's thread during an active scenario, as a reply or as the first message. It reaches the stewards checked in at that station within the timings in A-004, with a visible in-app notification, and messages only reach operators in the station's line group (#315).
- ○ **Unanswered first:** A thread is unanswered from a steward message until an operator replies. Opening it changes nothing. The operator's list shows unanswered threads first, oldest at the top.
- ✓ **Lifetime:** The thread stays at the station while the scenario is live, so a steward who checks in later sees the earlier messages. At stand-down it is closed and removed from both clients.
- ✓ **Offline:** A message written without connection is queued, sent once on reconnection (A-006) and shown as pending, and it keeps its original time written.
- ✓ **Incident log:** Every message writes an event to the incident log (A-023) with the station as the source, the text and both timestamps (written and received by the server), and without the steward's identity.

### Slide 16 · PBI 027 · Usability test plan

Title: PBI 027 · Usability test plan

Lead text at the top left, 32px Grey, on three lines: "Proposed session:", "1 operator + 3 stewards · 1.5 to 2 hours", "simulated fallback scenario"

Three cards in a row:

- **01 · INTRODUCE.** Body: First introduce the testers to the plan for the day and what they can expect. After this we would like to separate each person and ask preliminary questions.
- **02 · OBSERVE.** Heading: Individual tasks. Body: Operator and stewards complete realistic tasks while thinking aloud. This allows them to look at and try the system before a possible field test.
- **03 · DISCUSS.** Heading: Feedback & improvements. Body: Semistructured individual interviews. Compare with current practices and identify what should change. How did they like the system?

A small card that sits above the top edge of card 02, overlapping it slightly:

- Label: 02.1 · FIELD TEST?
- Body: Go out in the metro and try the system. Needs more clarification.

Callout strip at the bottom: We are testing the application, not the participants

### Slide 17 · PBI 027 · Proposed test structure

Title: PBI 027 · Proposed test structure

Subheading: Four parts, within a two-hour session

Row list with four rows:

| No. | Title | Time | Body |
|---|---|---|---|
| 01 | Introduction & existing workflows | 15 to 20 min | Short interview on procedures and pain points. Introduce think-aloud and ask for recording consent. |
| 02 | Individual task-based testing | 25 to 30 min | Participants work separately: scenario activation, assignment, arrival, station status and messages. |
| 03 | Field test or office simulation | 20 to 30 min? | Observe use while moving between locations, if travel time permits. Decision needed from Metro. |
| 04 | Semistructured feedback | 15 to 20 min | Open questions on usability, missing information and differences from current routines. |

Line under the rows, 24px Grey: Staffing: ideally 2 students per steward, a facilitator and a note-taker or technical support. One or more operator observers.

### Slide 18 · PBI 027 · For discussion with Metro

Title: PBI 027 · For discussion with Metro

Subheading: Does this work in practice?

Two cards side by side.

Left card:

- Label: MAIN DECISION
- Heading: Field test or simulate indoors?
- Body: With only two hours available, would walking from the Metro Service building to a station leave enough time to test and interview participants? How far apart are the planned test locations?
- Body: Would a simulation in the office be more realistic to organise?

Right card:

- Label: PRACTICAL CONFIRMATIONS
- Heading: What do we need?
- • 1 operator and ideally 3 stewards
- • Separate participants for individual tasks
- • Android phones and operator access
- • Permission for audio recording, with the participants' consent
- • Metro tickets or other access for the students who accompany stewards
- • Any operational, security or confidentiality restrictions: what should we not ask participants to do, observe, record or discuss?

Callout line at the bottom: Our main request: Is the structure realistic, and which workflows or situations would you like us to include?

### Slide 19 · Up next

Title: Up next · Started & in progress

Subheading: Useful additions beyond the core steward workflow

Two cards. The left one is wider, about 65%.

Left card:

- Label: PBI 030 · ADMIN DASHBOARD
- Heading: Managing users and scenarios
- Body: An administration view is being implemented to let authorised administrators manage user accounts and roles, create or edit scenarios, and review relevant activity.
- Body: This is additional functionality we consider valuable for maintaining and operating the system, even though it is not central to the usability test.

Right card:

- Label: NEXT STEPS
- Heading: Implementation & evaluation
- • Continue the admin work
- • Finalise the test setup
- • Run usability evaluation
- • Turn findings into prioritised issues

Line at the bottom, 24px Grey: Status: PBI 030 is in progress, not presented as completed functionality.

### Slide 20 · PBI 030 · Questions

Title: PBI 030 · Questions for Carsten

Subheading: Accounts and access

Two cards side by side:

- **01 · LOGIN.** Stewards may sign in through their work phone rather than in each app. How important is it that our app supports the same login? Should we consider that integration for future development?
- **02 · LINES.** Should operators and stewards only see information for their own Metro lines, or are there situations where they need to see several lines?
