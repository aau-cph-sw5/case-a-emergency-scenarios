# ADR 0004. Databricks 

**Status.** Accepted 
**Date.** 2026-10-07
**Deciders.** Theocharis Tavantzis(PO), Simon Klarlund Nielsen group 7.
**Related backlog items.** NO-PBI, "[IT Requirements AAU.pdf](https://github.com/user-attachments/files/33241712/IT.Requirements.AAU.pdf)
IT-requirements AAU" provided by PO

## Context
These adrs were filled out retrospectively and are not in chronological order. This choice was actually made before 0001. 

When starting to work with databricks as required by the IT requirements, several issues occurred: 
Free version allows Databricks to train on the data and to not upload sensitive information, which did not work with our data. 
We needed an institution managed workspace to use it for free with our university license. 
We asked out PO how to proceed and was told to disregard Databricks and use something that is compatible if it turns out we have to switch back to it. 

<img width="975" height="246" alt="databricksDisregarded" src="https://github.com/user-attachments/assets/7cc293c6-68fe-4227-91e1-6e3aa6ce9e6a" />

## Decision
We disregarded initial IT requirements of using Databricks. 

## Consequences

What becomes easier.
Allows us to choose other services that are better suited for our needs as long as its compatible. 

What becomes harder. 
If it later turns out we do have to use Databricks we have to move over to it. 

## Alternatives considered

**adr 0001** 
Alternatives were weighed and described in https://github.com/aau-cph-sw5/case-a-emergency-scenarios/blob/templateFilling/docs/adr/0001-initial-database-chosen.md

**{Alternative}.** As above.

## Notes
The related requirements provided, that we superseded:
[IT Requirements AAU.pdf](https://github.com/user-attachments/files/33241721/IT.Requirements.AAU.pdf)
