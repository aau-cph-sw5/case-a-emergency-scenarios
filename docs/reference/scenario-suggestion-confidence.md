# Scenario suggestion: confidence threshold

What `src/services/scenario-suggestion/confidence.ts` does with the ranking
from [scenario-suggestion.md](scenario-suggestion.md) (#355) before it reaches
the operator (MET-A-019, #356). Why:
[ADR 0014](../adr/0014-confidence-threshold-for-scenario-suggestions.md).

## What it returns

`suggestScenarios(description, docs, { ranker })` ranks the documents with the
ranker, gives each candidate a confidence and applies the threshold. The caller
builds the ranker, the same way the ranker takes its tokenizer, so this file
needs no station list:

```ts
const ranker = new BM25Ranker(createDanishTokenize(stations));
const result = await suggestScenarios(text, docs, { ranker });
```

The result is the response of `POST /api/v1/scenario-suggestions` (#357), with
`score` being the confidence:

| `status` | When | `candidates` |
|---|---|---|
| `CONFIDENT` | At least one confidence is above the threshold | Those candidates, at most five (`shortlist`), highest first |
| `NO_CONFIDENT_CANDIDATE` | None is above it, or there are no scenarios | None. The client shows the full list |

A confidence exactly at the threshold does not exceed it. Equal confidences are
ordered by scenario id.

## Confidence

By default the confidence is the ranker's score, which #355 already normalises
to 0..1, rounded to four decimals. The same description and scenarios always
give the same confidence. Another scorer implements `ConfidenceScorer` and is
passed as `{ scorer }` with its own `threshold`. Confidences outside [0, 1] are
rejected.

## Threshold

`DEFAULT_CONFIDENCE_THRESHOLD = 0.15`, provisional until the evaluation (#421)
measures it on real descriptions. It was chosen on an invented catalogue of one
scenario per M1/M2 segment and track (42 scenarios), with
`BM25Ranker(createDanishTokenize(stations))` and `includeUnknownTerms: true`.
`tests/unit/confidence-calibration.test.mjs` repeats these decisions:

| Description | Top score | Tied at top | With 0.15 |
|---|---|---|---|
| Sporskiftefejl ved Nørreport, spor 1 mod Kongens Nytorv | 0.539 | 1 | Right segment first |
| Signalfejl mellem Kongens Nytorv og Christianshavn spor 1 | 0.521 | 1 | Right segment first |
| Signalfejl mellem Kongens Nytrov og Christianshvan spor 1 | 0.521 | 1 | Right segment first, typos accepted |
| Problem ved KGN spor 1 | 0.398 | 2 | Right segment first |
| Defekt tog spor 2 Ørestad Vestamager | 0.394 | 1 | Right segment first |
| Strømsvigt på strækningen VAN FL spor 1 | 0.394 | 1 | Right segment first |
| Ingen kørestrøm mellem Frederiksberg og Forum | 0.336 | 2 | Right segment first |
| Tog holder stille mellem FOR og KN på spor 2 | 0.280 | 1 | Right segment first |
| Der er en person i sporet ved Amagerbro, spor 2 er spærret mod Lergravsparken | 0.280 | 1 | Right segment first |
| Elevatoren på Nørreport er i stykker | 0.202 | 4 | Shortlist, but no incident on the track |
| Spor 2 er lukket | 0.135 | 21 | Full list |
| Nødbremse aktiveret på Forum, toget holder ved perronen spor 1 | 0.117 | 2 | Full list, although the station is right |
| Hej, vi har lige fået en melding fra føreren … mellem Christianshavn og Amagerbro på spor 1 | 0.090 | 1 | Full list, although the segment is right |
| tog holder stille mellem for og kn på spor 2 | 0.037 | 21 | Full list: lowercase codes name no station |
| Passager med akut sygdom i toget; Der er problemer med elevatoren | 0 | 42 | Full list |
| Spor 1 | 1.000 | 21 | Shortlist of 5 of the 21 |

Every description that names a segment scored at least 0.280, and every one
that names no place but a track scored at most 0.135, so 0.15 lies between
them, closer to the vague side. A threshold between 0.09 and 0.117 would also
let the last two correct descriptions through, but it would let "Spor 2 er
lukket" through too, with 21 scenarios tied.

### includeUnknownTerms

Keep the default `true`. With `false`, every description in the table that
matches any word scored 1.000, "Spor 2 er lukket" and the lowercase codes
included, so no threshold can tell a good match from a vague one. With `true`,
words that match no scenario lower the score, which is what separates a
description of a segment from one that only mentions a track.

## Known failure modes

- **Many words that match nothing push a correct match below the threshold.**
  Every word that is in no scenario counts towards the best possible score, so
  a chatty description, or one with one station and many incident words, falls
  back to the full list. The tokenizer removes stopwords, but words such as
  "melding" and "føreren" still count.
- **A short vague description passes.** "Spor 1" matches every word it has, so
  it scores 1 although 21 scenarios tie. The score says how much of the
  description matched, not how many scenarios fit it equally well.
- **A place alone passes.** The score only knows places and tracks, so
  "Elevatoren på Nørreport" gets the Nørreport scenarios. The operator still
  confirms before anything is activated (A-007).
- **One station gives a tie.** "Ved KGN" matches both neighbouring segments on
  both tracks equally, so the right one can be third. It is still in the five.
- **Codes only count in capitals.** "for og kn" names no station, since the
  tokenizer treats lowercase codes as words, so it falls back to the full list.
- **The catalogue is invented.** Real scenario names may hold more words than
  "Enkeltsporsdrift A - B", which changes every score.
