# Sprint 3 retrospective. Project A

**Date.** 2026-10-26  
**Present.** All groups 7, 9 ,10 , Theo, Christian  


## The numbers

**Sprint 3 delivery (Project A):**
- **Items finished:** 2 (MET-A-002, MET-A-008).
- **Items carried over / in progress:** 6 (MET-A-004, MET-A-005, MET-A-007, MET-A-010, MET-A-011, MET-A-023) 
- **Average PR merge time:** 2 days, 8 hours 
The PR merge time was discussed during the retrospective

## What went well

**Improved integration and team autonomy**

- The integration team was used way more effectively this sprint, it improved the coordination between the groups and gave a better overview of the project and what everyone was working on
- Decisions could be made by the integration representatives rather than having long discussions with all 18 members that often ended up being scattered and directionless
- Groups had clearer responsibilities and greater autonomy to make decisions within their own tasks
- having frequent integration meetings improved cross-team refinement and understanding of dependencies and let the team change jobs around to fit better as we progressed during the sprint
- Rotating integration representatives each sprint will help distribute knowledge and reduce specialisation 

**Better communication and access to information**

- Review communication improved, particularly through the use of a web hook on Discord to notify each member when they have to review prs. This reduced the need to reach out to each other and improved the speed. 
- Meetings became more focused, involving only the relevant people.
- Having less meetings with everyone reduced information overload made relevant knowledge easier to find.
- It became easier to identify who was responsible for particular tasks and whom to contact for information.
- Discord communication improved in general, we had agreed on assuming we should answer as much as possible so no messages were left hanging for others to respond to.
- Survey results indicated improvements in responsiveness and communication with stakeholders and the Product Owner.

**Improved review process and time management**

- The PR review process improved compared to previous sprints, although review and merge times can still be reduced.
- Clearer team boundaries and more autonomous decision-making improved time management.
- The integration team handover worked well.
- Previous representatives shared their knowledge with the incoming representatives and participated in the first integration meeting.

**Customer and stakeholder collaboration**

- Communication with Metro and the Product Owner improved
- Carsten actively provided feedback and answered questions and those answers were passed along to the Team and shared in the drive
- The Sprint Review demonstrated meaningful progress, and Carsten responded positively to the working application
- Theo noted that the project had become noticeably smoother after a slower start.

## What did not

**PR review and merge times**

- Although the review process improved, PRs still spent too long awaiting review, changes or merging.
- PR authors did not always respond quickly to review feedback, extending the time PRs remained open.
- The average merge time was reported as 2 days and 8 hours.
- Too much work in progress contributed to PRs accumulating in the review stage.

**Lack of automated code-quality and security analysis**

- Static analysis tooling has not yet been sufficiently implemented.
- Tools such as SonarQube or CodeScene could help provide visibility into code quality and maintainability.
- Significant dependency vulnerabilities were identified, highlighting the need for more consistent security scanning.
- Trivy was discussed as a possible tool for scanning Docker images and their dependencies for known vulnerabilities.

**Sprint scope and estimation**

- Some sprint items took longer than initially estimated.
- The teams did not always communicate underestimated work early enough to allow scope adjustments with the Product Owner.
- Work remaining unfinished or awaiting integration affected the ability to meet sprint commitments.

**Limited use of technical and team-health metrics**

- Existing surveys provide useful information about communication and collaboration.
- Technical metrics, such as defects, increment stability, code quality and security vulnerabilities, are not yet used consistently.
- There is also an opportunity to make it easier for team members to communicate how they are experiencing the project.

## Where we lost time

**Waiting for PRs to be reviewed and updated**

The review stage continued to be a bottleneck. Delays were caused both by waiting for reviewers and by PR authors not responding promptly to requested changes.
Christian pointed out that long cycle times often indicate too much work in progress, particularly when work accumulates in review.

**Large-group discussions**

Previously, many questions and frustrations were held until meetings involving all 18 members. These discussions were often inefficient because not everyone needed to participate in every decision.
This improved during Sprint 3 as more decisions were handled by integration representatives and relevant groups.

**Information overload and unclear communication routes**

How we communicated before made it difficult to find relevant information or identify who should be involved in a discussion, since we would have to look in every chat in the project in our shared Discord to find information.
Using group-specific Discord channels and clearer responsibilities reduced this overhead.

**Underestimated tasks and delayed scope adjustments**

Some tasks required more work than expected. 
The teams could have communicated this earlier to Theo and renegotiated sprint scope before delays affected delivery.

## Cross-team

**Integration Team coordination**

- Continue using integration representatives to make cross-team decisions rather than involving all members in every discussion
- if individual members have something they want brought up, they contact their representative and that person will take it to the integration team
- Maintain the rotation of representatives each sprint to distribute knowledge and avoid excessive specialisation.
- Continue the handover process where outgoing representatives share knowledge and attend the incoming team's first meeting.
- Theo expressed interest in joining integration meetings to improve coordination and streamline discussions.

**Discord and communication**

- Using team-specific channels for focused communication.
- Avoid unnecessary discussions in the town hall channel.
- Use the Discord bot and automatic notifications to direct questions and review requests to the relevant people.

**PR workflow**

- Consider reducing the required number of reviewers to one per PR to see whether it improves merge speed
- Establish clearer expectations for how quickly authors should respond to PR feedback.
- Noah will investigate creating a GitHub Action that notifies PR authors when their PR has been reviewed
- Reduce excessive work in progress to avoid accumulating PRs in the review stage
- Consider making the rule that every time group work starts, after stand up each group has to do their reviews before other work can start.
- On top of that, when getting feedback on prs, after doing reviews, updating/fixing/improving your pr to be reassessed and merged should be TOP priority before starting new work
- These two final points should reduce merge time considerably and improve flow and decrease risk of having out of date code 

**Code quality and security**

- Start using a static code-analysis tooling, such as SonarQube(Theo's suggestion) or CodeScene. (Foverskov will look into it. )
- Investigate Trivy for detecting known security vulnerabilities in Docker images and dependencies.
- Consider tracking technical metrics such as bugs, unstable increments, code quality and vulnerabilities.

**Sprint Review and Metro communication**

- Consider sharing selected Sprint Review materials with Metro before the meeting, allowing more time for demonstrations and discussion.
- Only send information that is useful for Carsten to review beforehand.
- Agree on a suitable timeframe so Metro has enough time to review the materials.
- Encourage Carsten to share relevant materials with colleagues to gather additional feedback.
- Theo will ask Carsten whether this approach would be useful.

**Sprint planning and scope**

- Communicate underestimated work to Theo during the sprint rather than waiting until the next planning or review.
- Reassess scope when necessary and focus on completing the most important items.

## One improvement for next sprint

**Improvement.** Improve visibility into code quality and security by introducing automated static analysis and vulnerability scanning in the shared repository.
**Owner.** Andreas Foverskov

**How we will know.** By the next retrospective, at least one agreed static-analysis or security-scanning tool should be integrated into the project's CI workflow, with results accessible to everyone. 
The findings should be reviewed to identify code-quality issues or known vulnerabilities requiring attention which will be important to the metro 

## Carried over from last time

The previous retrospective highlighted communication difficulties, slow PR reviews, unclear ownership and inefficient cross-team coordination.

**Communication improved.** Discord responsiveness increased, and team-based channels made it easier to reach the relevant people. 
Survey results also showed improved communication with stakeholders and the Product Owner.

**Integration improved.** More effective use of the integration team reduced the need for large-group discussions and improved team autonomy. 
Clearer responsibilities and successful handovers made information easier to access.

**PR reviews improved, but remain an issue.** Review processes became better, but long merge times and delays in responding to feedback still affect delivery.

Overall, the changes made after the previous retrospective had a positive effect. 
The focus for the next sprint should be on maintaining these improvements while strengthening technical quality assurance and further reducing PR bottlenecks.
