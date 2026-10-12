# ADR 0002. Initial Server Chosen

**Status.** Accepted
**Date.** 2026-10-07
**Deciders.** Noah Terpe Woods, Elias Hildebrandt, Simon Klarlund Nielsen, group 7
**Related backlog items.** NO-PBI, project requirement

## Context
We needed to choose a hosting platform to begin development and deploy our application.
Hosting is mentioned across the GitHub documentation and is not related to one specific PBI, but is needed for the project as a whole.
Render offers a free hosting option and is easy to set up, making it suitable for our initial development.

## Decision

We will use Render as a server to host our deployment of our React application. 

## Consequences

_
What becomes easier:
Free hosting without needing to commit to a paid plan.
Easy setup and deployment, allowing us to focus on development.
Deployment can be connected to GitHub, making it easier to keep the application updated.

What becomes harder:
The free plan has limitations on resources and usage.
Free web services can go inactive after 15 minutes without traffic, causing delays when starting again.
We depend on Render's availability and limitations.
Reconsidering our hosting platform if the free plan no longer meets the project's requirements.
_

## Alternatives considered

_**Railway** rejected because it only gives 1$ credit each month which was not enough. 

**Vercel** this is usde for serverless functions so not ideal since we don't use conventional backend. 

**Microsoft Azure** Used to give 100$ every year for students, but we couldn't find information on how long that lasts, so we did not want to risk it running out during the project. 

_
## Notes

This is our initial hosting decision and should be reconsidered if the project requires more resources or functionality than Renders free plan provides
