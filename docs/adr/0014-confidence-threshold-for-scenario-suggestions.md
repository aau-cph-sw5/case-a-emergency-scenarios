# ADR 0014. Use the BM25 Score as Confidence and Suggest Above 0.15

**Status.** Proposed
**Date.** 2026-11-18
**Deciders.** Oskar Mortensen, Group 9
**Related backlog items.** MET-A-019 (#19, #354, #355, #356, #421)

## Context

MET-A-019 requires that the operator is told when no candidate is good enough,
and offered the full list instead of a poor ranking. That needs a confidence
that is deterministic and means the same for every description.

The ranker from #355 already divides each BM25 score by the best score the
description could get, so its scores are in 0..1 and are not relative to the
top candidate. The Danish tokenizer from #354 turns station names and codes
into one token each and removes stopwords. No labelled Danish descriptions
exist yet; the evaluation (#421) will measure on them.

## Decision

The confidence is the ranker's score. A second scorer, such as a re-scoring
model, can replace it behind `ConfidenceScorer` with its own threshold.

The caller builds the ranker and passes it to `suggestScenarios`, the same way
the ranker takes its tokenizer, so the confidence code needs no station list.

A candidate is suggested when its confidence exceeds 0.15, with the Danish
tokenizer and `includeUnknownTerms: true`. On an invented M1/M2 catalogue,
every description that names a segment scored at least 0.280 and every one
that only names a track scored at most 0.135, so 0.15 lies between them. The
measurements are in the reference doc and in a test.

The threshold leans towards the full list. A wrong fallback costs the operator
a search in the list; a wrong shortlist can lead to the wrong plan.

## Consequences

- Descriptions with many words that match no scenario fall back to the full
  list even when they name the right segment or station.
- A description that names a station but no incident on the track still gets
  that station's scenarios, and a very short one such as "Spor 1" scores 1
  although many scenarios tie. A lexical score cannot tell these apart.
- The calibration test fails when the ranker or the tokenizer changes the
  decisions, which is the signal to choose the threshold again.
- Rejected: `includeUnknownTerms: false`. Every description that matches any
  word then scores 1.0, so the threshold cannot separate good from vague
  matches.
