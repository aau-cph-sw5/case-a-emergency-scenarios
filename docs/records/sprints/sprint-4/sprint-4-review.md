
# Sprint 4 review. Case A : Emergency Scenarios

**Date.** 2026-11-09  
**Sprint planning date.** 2026-10-26  
**Present.** Groups 7, 9 and 10, Metro Service representative Carsten, semester coordinator Daniel Russo, and PO Theocharis.

---

## What we said we would do

### Sprint Goal

> Complete the core MVP workflow connecting the control-room interface and the steward mobile application.
>
> A steward should be able to check in at a station and have their status reflected live in the operator interface, allowing operators to see which required stations are manned.
>
> Operators should also be able to update and stop an active scenario.

We also wanted to have an interactive MVP ready for Carsten to try himself during the Sprint Review.

The main PBIs for this sprint were MET-A-011, MET-A-010 and MET-A-013. MET-A-009 and MET-A-004 were stretch items, depending on how much of the main work we managed to finish.

### Planned PBIs and outcomes

| Item | Title | Priority | Estimate | Outcome |
|---|---|---|---|---|
| MET-A-011 | Control-room interface and functionality | Primary | L | Done |
| MET-A-010 | Steward graphical scenario overview | Primary | L | Done |
| MET-A-013 | Steward location and position reporting | Primary | M | Requirements moved into MET-A-015 |
| MET-A-009 | Stop / stand down a scenario | Stretch | Not estimated | Done |
| MET-A-004 | Remaining real-time propagation functionality | Stretch | Not estimated | Done |

### Additional work and handover status

| Item | Status | Notes |
|---|---|---|
| MET-A-005 | Done | Offline steward view |
| MET-A-006 | In progress | Needs to be updated on Kanban |
| MET-A-014 | To be marked Done | Remove redundant acceptance criterion first |
| MET-A-015 | In progress | Revised steward status and station reporting |

### Sprint Goal assessment

We managed to complete the control-room interface and steward graphical overview, along with both of the original stretch items.

We also demonstrated the connected flow using the real server, including scenario activation, live updates from stewards to the operator, scenario switching and stand-down.

The main change from the original plan was MET-A-013. While working on position reporting, we realized that some of the requirements did not quite fit together. 
The requirements were also based on assumptions about how Metro needed to track stewards, which we were able to clarify with Carsten during the review.

This work is now being handled under MET-A-015, where we are using a more explicit station status flow instead of relying on location reporting.

We also achieved the goal of having Carsten interact with the MVP. He was able to use the operator interface himself, and we got feedback on the actual flow rather than only presenting our design decisions.

The remaining part of the Sprint Goal is the revised steward status reporting, which is still in progress. So while we demonstrated most of the intended workflow, we have not finished all of it yet.

## What we are demonstrating

### 1. Operator interface and scenario management : MET-A-011

Carsten was given the operator interface to try during the presentation.

After logging in, the operator sees the metro map and a list of available scenarios. Carsten selected Scenario 1, which opened a preview showing the affected stations, how many stewards are needed at each station, and the total number required.

The idea is that the operator can quickly see what a scenario involves before deciding to activate it.

After confirming activation, the interface keeps roughly the same layout as the preview, but now shows the live staffing situation.

The station coverage indicators distinguish between stations that still need stewards, stations with stewards on their way, and stations that are covered. These are also sorted by their staffing status.

The map is interactive, with zooming and navigation between lines. We also showed the information panels containing station and steward status, along with the activity log.

Some of the interface elements were not completely finished, but Carsten liked the overall design. We asked whether the status indicators needed additional symbols, which he did not think were necessary.

The interface follows the operator wireframes, and a shared data provider is used to keep the different views updated with the same information.

### 2. Scenario switching and stand-down : MET-A-009

We demonstrated how an operator can switch from one scenario to another while a scenario is already active.

When selecting "Switch scenario", the operator can preview another scenario without losing the information about the currently active one. Once the new scenario is selected and confirmed, it becomes active.

Carsten asked what happens to stewards who have already checked in when the scenario changes.

We explained that they would need to acknowledge the new scenario and confirm their station again.

He liked this approach, since it means stewards are made aware that something has changed and need to look at their new instructions. Otherwise, they might continue following the previous plan without realizing their responsibilities have changed.

We also demonstrated stopping an active scenario. This requires confirmation to avoid accidentally ending a scenario with a single click.

When a scenario is stopped, connected clients receive the update and can acknowledge that they have seen it.

### 3. Real-time updates : MET-A-004

When a steward reports their station status, the other connected clients receive the update automatically.

This means the operator can see changes in staffing without refreshing the page.

The functionality was reported to work with 25 simultaneous clients.

The operator interface uses event-driven updates, so it updates when something happens rather than constantly refreshing all its data.

### 4. Offline steward view : MET-A-005

We demonstrated that stewards can still access their active scenario and instructions when they lose their connection.

The application also tells them when they are offline, so they are aware that the information might not be updating.

### 5. Steward graphical overview : MET-A-010

On the steward phone, the active scenario is shown on a metro map.

The steward's own station is highlighted, making it easier to see where they are supposed to go.

Once the steward has confirmed their station, they can access the tasks and instructions relevant to that station.

The intention is to make it easier for stewards to find the information they need without searching through the full emergency scenario documents.

### 6. Updated steward station reporting: MET-A-013 / MET-A-015

We presented the revised approach to how stewards report their status.

Previously, the requirements focused on reporting a steward's location and how recent that location report was. However, this could lead to a station still appearing covered even after the steward had left.

There were also conflicting expectations about whether the steward should report their location, confirm arrival, or continuously update their status.

The new flow we presented works like this:

1. When a scenario starts, the steward chooses a station.
2. The app shows how many stewards are already assigned or heading to that station.
3. If another station needs more coverage, the app can suggest going there instead.
4. The steward confirms that they are on their way.
5. Once they arrive, they check in at the station.
6. The operator can see that the station is now covered.
7. When the steward leaves, they check out.

We showed an example where a steward selects København H, but the app suggests Kongens Nytorv because another steward is already heading to København H.

Carsten liked this idea. He explained that they often have around 12 stewards on a shift, spread across the metro, so helping them distribute themselves between stations would be useful.

The checkout flow we demonstrated originally required operator approval. Carsten clarified that this was unnecessary, since stewards are self-governing and should not need permission to leave a station.

He also confirmed that we do not need to verify a steward's physical location through geolocation. If a steward reports that they are at a station, Metro trusts that information.

These clarifications will be included in the further refinement of MET-A-015.

### 7. Activity log and messaging

We showed the status log in the operator interface, which contains timestamps and information about actions taken during the scenario.

We asked Carsten whether he preferred having the log visible all the time or opening it separately.

He preferred having it visible, although it could be smaller. He also thought it would be fine to use buttons for some information, as long as notifications clearly show when something new has happened.

The messaging functionality is not implemented yet, but we included the button in the interface and discussed what it could be used for.

Carsten explained that important messages should still go through the radio.

However, there are situations where stewards notice something relevant, but not urgent enough to interrupt radio communication. For example, an escalator might be out of service during an emergency scenario.

He thought messaging could be useful for reporting this kind of information to the operator without cluttering the radio.

## What we learned

### Station status instead of location tracking

One of the biggest clarifications from this review was what Metro actually needs to know about the stewards.

We initially worked from requirements that focused on location reporting, report age, and detecting whether a steward had become stale.

After discussing the workflow with Carsten, it became clear that the main information the operator needs is whether the required stations are staffed.

Carsten also explained that the operator does not need to know exactly which individual steward is at each station, only whether there are enough stewards there.

This changes how we should handle MET-A-015 and how station coverage is represented in the operator interface.

### Stewards do not need to report every task

We asked which tasks stewards should mark as completed.

Carsten explained that the operator only needs to know whether they are present at their assigned station.

Other tasks, such as wearing a vest or helping passengers, are things the stewards do as part of their work. There is no need to have them report these actions individually.

This means we can simplify the requirements and avoid adding functionality that would not be useful in practice.

### Checkout does not need operator approval

We originally included operator approval when a steward requested to leave their station.

Carsten explained that this does not fit how stewards work. They are self-governing and do not need permission from the control room to leave a station.

We still need to make sure the operator has an accurate overview of which stations are staffed, but the checkout itself should not depend on approval.

### The 30-second staleness rule may not be needed

We discussed the requirement for detecting when a steward's status becomes stale.

One concern was that when a steward locks their phone and puts it in their pocket, the app might no longer be able to report their status continuously.

Carsten explained that connectivity is generally very good throughout the metro, including stations and tunnels, since Metro has its own infrastructure for operational devices.

He did not think the 30-second requirement was necessary.

We will need to update the relevant acceptance criteria, while still considering how to handle situations where a device actually loses its connection.

### Stewards need information about the current service

Carsten mentioned that it would be useful for stewards to see more information about the train service after checking in at a station.

For example, they may need to help passengers understand which lines are running, where service has changed, or which alternative route to take.

This information could be shown alongside the station instructions, although the exact scope still needs to be clarified.

### The interactive review worked well

Daniel Russo commented positively on the presentation, especially that Carsten was able to use the application and discuss the functionality while trying it.

He also pointed out that our understanding of the product now seems much closer to how Metro actually thinks about the problem.

One thing we should improve is making the completion status of the PBIs clearer during the review.

We started by presenting our Definition of Done, but without first showing which PBIs and acceptance criteria had actually been completed.

For the next review, we should give a short overview of the planned PBIs, their status, and what we are demonstrating.

## Questions for Metro Service

The main questions about location reporting, checkout approval, task completion, and stale status were answered during the review.

The following still need clarification or further refinement:

| Item | Question | Why it blocks us |
|---|---|---|
| MET-A-015 | How should checkout and station coverage be handled when stewards return to normal service? | We need to finalize the status flow |
| MET-A-015 | How should we handle old station status when a steward loses connection? | We need to update the original staleness requirements |
| Steward application | What information about train operations and service changes should stewards be able to see? | Affects what information we need to show on the phone |
| Messaging | Should messaging only go from steward to operator, and what types of messages should it support? | We need to define the scope before implementing it |
| Stub server / related PBI | Can we remove the stub server now that we are using the real server, even though it was part of a PBI? | We need to clarify whether removing it affects the original requirement |

## What we intend next sprint

For Sprint 5, we want to finish the remaining MVP functionality, particularly the steward status flow and the work around MET-A-016, MET-A-017 and MET-A-018.

We also need to finish integrating the frontend and backend changes, update the PBIs affected by today's feedback, and make sure the shared development environment reflects what has actually been implemented.

We are considering a usability test with stewards in the beginning of sprint 6. 
Before that, we need to decide what we want to measure, which tasks the participants should perform, and who will be responsible for preparing the test.

## Decisions taken in this meeting

| Question | Answer | Who said it |
|---|---|---|
| Do stewards need geolocation verification when checking in? | No. Metro trusts stewards to report their own presence. | Carsten |
| Does checkout require operator approval? | No. Stewards are self-governing. | Carsten |
| Should stewards mark individual tasks as completed? | No. The operator mainly needs to know whether stations are staffed. | Carsten |
| Is the 30-second staleness requirement necessary? | Carsten did not think it was needed. | Carsten |
| Should stewards confirm their station again when a scenario changes? | Yes. They should acknowledge the new scenario and review their instructions. | Carsten |
| Can messaging be used instead of radio for some information? | Yes, for nonurgent messages. Important messages should still use radio. | Carsten |
| Should the status log always be visible? | Preferably visible, but it can be smaller. Buttons are also fine if they clearly show notifications. | Carsten |
| Does the operator need to know which individual steward is at each station? | No. The staffing status of the station is what matters. | Carsten |

### Follow-up

We need to update MET-A-013 and MET-A-015 to match the new station status requirements and remove or revise acceptance criteria that no longer reflect Metro's needs.

We should also check whether any of these changes affect our existing contracts or architecture documentation.

For the next Sprint Review, we will include a clearer overview of which PBIs are Done, which are still in progress, and which acceptance criteria have been met.
