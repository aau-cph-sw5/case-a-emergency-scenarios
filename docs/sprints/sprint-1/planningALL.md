# Sprint 1 planning

**Groups 7, 9, 10 - Case A**

**Date:** 14-09-2026  
**Present:** Members of Groups 7, 9 and 10

> **Retrospective note:** This Sprint Planning document was filled out after
> Sprint 1 had taken place. At the start of the sprint, the formal planning
> and cross-group coordination process had not yet been established.
> This document therefore records the planning, decisions and division of work
> that developed during the sprint, rather than describing a formal Sprint
> Planning meeting held beforehand.

## Sprint Goal

Get a shared understanding of Case A and the Metro domain, start working on
the first PBIs, and figure out how to divide and coordinate the work between
Groups 7, 9 and 10.

## Selected PBIs

During Sprint 1, we started working on MET-A-001 and MET-A-003.

We did not formally estimate the PBIs at the start of the sprint, since we
were still getting familiar with the domain and figuring out how the three
groups should work together.

| PBI | Short title | Owner(s) | Estimate |
|---|---|---|---|
| MET-A-001 | Derive the scenario domain model from the Metro alternative-operation presentations | G7 / G9 / G10 | Not formally estimated |
| MET-A-003 | Scenario state contract published and versioned | G7 / G9 / G10 | Not formally estimated |

### How we split MET-A-001

MET-A-001 was still one PBI, but we split the work into smaller parts so we
could work on the domain model in parallel:

1. **M1/M2 model** - model the important entities and relationships found in
   the M1 and M2 material.
2. **M3/M4 model** - do the same for the M3 and M4 material.
3. **Review together** - compare the two models and agree on the common
   entities, relationships and terminology.
4. **Use it for MET-A-003** - use what we learned and agreed on from the models
   as a basis for the scenario state contract.

The M1/M2 and M3/M4 models were therefore not separate PBIs. They were smaller
parts of the work needed to complete MET-A-001.

The rough flow was:

**MET-A-001**
→ M1/M2 model + M3/M4 model
→ review together
→ shared domain understanding
→ **MET-A-003 scenario state contract**

## Cross-group dependencies

We did not have all dependencies mapped out at the beginning of the sprint.
Most of them became clear as we started working.

| Our PBI | We need | From group | Needed by | Agreed action |
|---|---|---|---|---|
| MET-A-001 | M1/M2 model | G7 | Before reviewing the full model | G7 works on the M1/M2 model and shares it with the other groups |
| MET-A-001 | M3/M4 model | G10 | Before reviewing the full model | Work on the M3/M4 model and share it with the other groups |
| MET-A-001 | Agreement on the combined domain model | G7 / G9 / G10 | Before using the model further | Review M1/M2 and M3/M4 together and agree on the shared concepts |
| MET-A-003 | Domain understanding from MET-A-001 | G7 / G9 / G10 | Before finishing the state contract | Use the reviewed domain model as the basis for the contract |

## Blocking or Metro questions

We wanted access to the slides we were shown at the metro presentation.
We wanted a confirmed tech stack, or to know if we could freely choose. 
We wanted to be sure of the AI usage rules. 

## Risks and assumptions

**Risk or assumption**

We started MET-A-001 and MET-A-003 before we had fully figured out how the
three groups would coordinate work.


**What we will do**

Use what we learned in Sprint 1 to make ownership and dependencies clearer
during Sprint 2 planning.

---

**Risk or assumption**

Splitting the domain modelling into M1/M2 and M3/M4 could lead to the groups
understanding or modelling the domain differently.

**What we will do**

Review the models together before using them as a shared model, and agree on
terminology, entities and relationships.

---

**Risk or assumption**

The domain model will probably change as we learn more about the Metro domain
and start implementing more of the system.

**What we will do**

Keep the domain model as a shared document that can be updated when we learn
something new. 

---

**Risk or assumption**

MET-A-003 depends on the domain understanding we get from MET-A-001.

**What we will do**

Review the domain models first and use the agreed result when working on the
scenario state contract.

## Integration expectations

### We expect to provide

- An initial M1/M2 model.
- An initial M3/M4 model.
- A reviewed version of the domain model.
- Progress on MET-A-001 and MET-A-003.
- What each group has learned about the Metro domain.
- Any dependencies we discover while working.

### We expect to receive

- The domain findings from the other groups.
- Feedback on the M1/M2 and M3/M4 models.
- Agreement on the shared entities, relationships and terminology.
- Information about dependencies found by the other groups.
- Input needed for the shared contract.

## Before planning ends

> Since Sprint 1 did not have one formal planning meeting, this checklist
> describes where we ended up during the sprint rather than what was completed
> at the start.

- [ ] Selected PBIs meet the Definition of Ready
- [x] Dependencies have started to become visible
- [x] Blocking questions are formally documented
- [x] Initial responsibilities are agreed
- [x] Cross-group dependencies have been discussed
- [x] The Sprint Goal is understood by the groups

## How Sprint 1 developed

### Monday - Getting started together

Groups 7, 9 and 10 met to talk about Case A, how we should work together and
what we understood about the project so far.

We did not get as far as making a complete Sprint Plan or dividing all of the
PBIs. The main purpose was getting everyone started and talking about how the
three groups could work together.

### Tuesday - Split up and investigate

We split into our groups and took responsibility for looking into smaller
parts of the project and Metro domain.

The groups then shared what they had found so everyone could get a better
understanding of the case instead of all three groups investigating exactly
the same things.

### Thursday - Starting the models and dividing the work

We started working more directly on MET-A-001.
Group 7 started the M1/M2 entity/domain
model.
The modelling work was split into an **M1/M2 model** and an **M3/M4 model** so
the work could happen in parallel. 

The idea was to review the two models together afterwards and use them to get
to one shared understanding of the domain. That shared understanding could
then be used when working on MET-A-003 and the scenario state contract.

Andreas, Mathias K and Kathrine also met as representatives from the
three groups to start dividing the work between Groups 7, 9 and 10.

This was basically the point where we started getting a clearer idea of which
group would be responsible for which parts of Case A.

## Sprint 1 planning outcome

Sprint 1 ended up being a mix of getting familiar with the project, starting
actual work and figuring out how the three groups should work together.

We went roughly from:

**All three groups trying to understand Case A**

↓

**Split up smaller areas to investigate**

↓

**Share what we learned**

↓

**Start MET-A-001**

↓

**Split the modelling into M1/M2 and M3/M4**

↓

**Review the models together**

↓

**Use the domain understanding for MET-A-003**

↓

**Start dividing responsibilities between G7, G9 and G10**

↓

**Take what we learned into a more structured Sprint 2**
