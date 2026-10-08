# Diagram conventions

These rules apply to all Case A diagrams.

Each diagram guide may add rules specific to that notation.

## 1. Use project terminology

Use the names already established in:

- the Case A backlog
- existing approved models
- shared contracts
- accepted ADRs
- the project glossary

Do not use two different names for the same concept without explaining the difference.

For the three student groups, use:

```text
Group 7 / G7
Group 9 / G9
Group 10 / G10
```

Use `group`, not `team`, when referring to Groups 7, 9 and 10.

## 2. One diagram should have one main purpose

A diagram should answer a clear question.

Good:

```text
M1/M2 entity model
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

If one diagram is trying to explain several unrelated things, split it into focused views.

## 3. Use the notation defined in the relevant guide

Do not invent new arrow types or symbols when the project already has a convention.

Current standards:

| Diagram | Notation |
|---|---|
| Entity / Domain Model | UML class diagram notation |
| Relational Data Model | Crow's Foot ER notation |
| State Machine | UML state machine |
| Sequence Diagram | UML sequence diagram |
| Integration Blooming | Case A project notation |

## 4. Meaning must not depend on colour

Colour can help make a diagram easier to scan.

It must not be the only thing that communicates meaning.

Use:

- labels
- UML symbols
- line types
- multiplicities
- group names
- stereotypes
- legends

For example, an enumeration may use a grey fill, but it should still be identifiable as an enumeration from the notation.

## 5. Arrows must have a defined meaning

An arrow is not decoration.

Its meaning depends on the diagram type.

Examples:

- entity model arrow: navigable UML association
- state machine arrow: valid state transition
- sequence diagram arrow: message
- blooming diagram arrow: relationship defined in the blooming guide

Do not use the same arrow style for two different meanings in the same diagram.

## 6. Label relationships

Use labels that explain the relationship.

Good:

```text
contains
covers
uses
versions
currentVersion
station
assignedTo
```

Avoid:

```text
related
link
data
connection
```

## 7. Show multiplicity or cardinality where it matters

Do not use a plain line if the number of related instances is important to the model.

Examples:

```text
1
0..1
0..*
1..*
2..*
```

If the correct multiplicity is not known, do not guess.

Record it as an open question.

## 8. Keep diagrams aligned with the source

A diagram is documentation.

If a PR changes something represented by a diagram, update the diagram in the same PR.

Examples:

- persisted relationship changes, update the relational model
- state transition changes, update the state machine
- contract interaction changes, update the sequence diagram
- cross-group dependency changes, update the blooming diagram

## 9. Keep confidential Metro material out

Do not reproduce confidential Metro slides, station layouts, operational screenshots or other non-public material in the public repository.

The diagram may document the model derived from approved project understanding without reproducing the confidential source.

## 10. Keep editable sources

For Mermaid, the Mermaid code in the Markdown document is the editable source.

For Draw.io, commit:

```text
diagram-name.drawio
diagram-name.svg
```

Do not keep only a screenshot or PNG for a diagram that is expected to change.

## 11. File names

Use lowercase and hyphens.

Good:

```text
m1m2-entity-model.md
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

## 12. Add context around the diagram

A diagram document should state:

- what it models
- what it does not model
- the relevant source or PBI
- assumptions
- unresolved questions where needed

Someone from another group should be able to understand the diagram without asking its author what it means.

## Review checklist

Before merging a diagram:

- [ ] The purpose is clear
- [ ] Terminology matches the project
- [ ] The correct notation is used
- [ ] Relationship meanings are clear
- [ ] Multiplicities or cardinalities are shown where needed
- [ ] Assumptions are identified
- [ ] No confidential Metro material is included
- [ ] The editable source is committed
- [ ] Another group can understand the diagram without an oral explanation
