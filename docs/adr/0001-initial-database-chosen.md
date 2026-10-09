# ADR 0001. Initial Database Chosen

**Status.** Accepted 
**Date.** 2026-10-06
**Deciders.** Elias Hildebrandt, Noah Terpe Woods & Simon Klarlund Nielsen , group 7
**Related backlog items.** MET-A-002

## Context

While working on MET-A-002 these developers made the choice to pick a database in order to future proof. 

Supabase was chosen for its easy to understand online interface where the tables could be viewed and understood visually. 

Supabase has unlimited uptime, but gets paused after 7 days of inactivity, so it was ideal since we just need to keep active. 

Choosing a database early is critical for continued work in all parts of the system. 

The choice was made to just have an initial choice, if better alternatives are found later, the better solution supersedes this one. 

## Decision

We will use Supabase as a platform for the database in order to have a large amount of uptime and an easy to use and understand interface. 

## Consequences

What becomes easier: 
Beginning actual development that requires data. 
All groups in team A early has access to the data, which should help the components be suited to the actual data and database we use. 


What becomes harder.
If we find a better solution later, switching will be an impediment to handle before all other development can continue, since it hinders all affected components. 

Communicating to the rest of the team to ensure everyone is aware of the database choice and how it works, since this decision was made by a few people in the larger team


## Alternatives considered
**Neon.** Only had 100 hours of free monthly uptime, if we needed to ping something constantly we would not have enough. 
**Aiven.** Didn't have a user friendly interface where we could see tables. 
**Alternative.** As above.

## Notes
