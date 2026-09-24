# Common diagram conventions

These rules apply to all Case A diagrams.

Each diagram-type guide may add more specific rules.

## 1. Use project terminology

Use the names already established in:

- the Case A backlog
- the current entity/domain model
- shared contracts
- accepted ADRs
- the project glossary when it exists

Do not use two different names for the same concept without explaining the difference.

For the three student groups, use:

```text
Group 7 / G7
Group 9 / G9
Group 10 / G10
```

Use `group`, not `team`, when referring to these groups.

## 2. One diagram, one main question

A diagram should have a clear purpose.

Good:

```text
M1/M2 planned scenario entity model
Scenario activation state machine
Scenario activation sequence
Sprint evolution and cross-group dependencies
```

Avoid:

```text
System diagram
Model 2
Final diagram
```

If one diagram is trying to explain several unrelated questions, split it into focused views.

The existing M1/M2 entity model is a good example of this approach. It has one overall model plus smaller views for different parts of the domain.

## 3. Meaning comes from notation, not colour

Colour may make a diagram easier to scan, but colour must not be the only way meaning is communicated.

Use:

- labels
- line types
- UML symbols
- multiplicities
- stereotypes
- group labels
- a legend when needed

For example, an enumeration may be grey in Draw.io, but it should still be identifiable as an enumeration from its contents or stereotype.

## 4. Use arrows carefully

An arrow is not decoration.

The meaning depends on the diagram type.

Examples:

- UML class model arrow: navigability or another defined UML relationship
- state machine arrow: a valid state transition
- sequence diagram arrow: a message
- integration blooming arrow: a project-specific relationship defined in that guide

Do not reuse one arrow style for different meanings in the same diagram.

## 5. Label relationships

Relationship labels should explain the meaning.

Good:

```text
contains
covers
uses
currentVersion
versions
assignedTo
```

Avoid vague labels such as:

```text
related
link
data
connection
```

For conceptual/entity models, prefer a verb or role name that makes the relationship readable as a sentence.

## 6. Show multiplicity/cardinality where it matters

Do not use a bare line if the number of related instances is part of the model.

Examples:

```text
1
0..1
0..*
1..*
2..*
```

If the multiplicity is not known, do not guess. Record it as an open modelling question instead.

## 7. Keep diagrams aligned with the source

A diagram is documentation, not a separate truth.

If a PR changes something represented by a diagram, update the diagram in the same PR.

Examples:

- a new persisted relationship changes the ERD
- a state transition changes the state machine
- a contract interaction changes a sequence diagram
- cross-group ownership/dependency changes the sprint evolution diagram


## 8. Keep editable sources

For Mermaid, the Mermaid code in Markdown is the editable source.

For Draw.io, commit:

```text
name.drawio
name.svg
```

Do not commit only a PNG or screenshot if the diagram is intended to evolve.

## 9. File naming

Use lowercase and hyphens.

Good:

```text
m1m2-entity-model.drawio
scenario-reference-data.md
scenario-activation-state.md
scenario-activation-sequence.md
sprint-evolution.drawio
```

Avoid:

```text
Diagram FINAL 3.drawio
newmodel.png
model_latest_latest.drawio
```

## 10. Add context around the diagram

A diagram file or Markdown page should state:

- what it models
- what it does not model
- source/PBI when relevant
- assumptions or unresolved questions

A diagram should not require somebody to ask its author what it is supposed to mean.

## 11. Review checklist

Before merging:

- [ ] The purpose is clear
- [ ] Terminology matches the project
- [ ] The correct notation is used
- [ ] Relationship meanings are clear
- [ ] Multiplicities/cardinalities are shown where needed
- [ ] Assumptions are not presented as confirmed facts
- [ ] No confidential Metro material is included
- [ ] The editable source is committed
- [ ] Another group can understand it without an oral explanation
