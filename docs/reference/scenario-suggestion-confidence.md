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

There are two values for the same cut. On the ranker's own score it is 0.15; on
the lifted confidence the endpoint returns it is
`DEFAULT_CONFIDENCE_THRESHOLD = toConfidence(liftScore(0.15)) = 0.3859`, with
`liftScore(s) = 1 - (1 - s)^3`. `rankerScore` carries the 0.3859, so only the
default ranker scorer gets it; any other scorer carries its own `threshold` (e5
has `E5_CONFIDENCE_THRESHOLD`) or is passed one, and `suggestScenarios` throws
if it has none. The 0.15 is provisional until the evaluation (#421)
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
| Nødbremse aktiveret på Forum, toget holder ved perronen spor 1 | 0.181 | 2 | Right station first |
| Hej, vi har lige fået en melding fra føreren … mellem Christianshavn og Amagerbro på spor 1 | 0.266 | 1 | Right segment first, however long the description |
| tog holder stille mellem for og kn på spor 2 | 0.049 | 21 | Full list: lowercase codes name no station |
| Passager med akut sygdom i toget; Der er problemer med elevatoren | 0 | 42 | Full list |
| Spor 1 | 1.000 | 21 | Shortlist of 5 of the 21 |

Every description that names a place scored at least 0.181, and every one that
names no place but a track scored at most 0.135, so 0.15 lies between them,
closer to the vague side. A lower threshold would let "Spor 2 er lukket"
through too, with 21 scenarios tied.

### How the score is shown

The numbers in this table and the threshold are the ranker's own scores. A
right match only reaches 0.3 to 0.5 there, because even a short description has
a few words that match no scenario and they count towards the best possible
score. As a percentage in the suggestion list that read as a poor match. So the
confidence the endpoint returns is the ranker's score lifted by
`1 - (1 - score)^3` (`CONFIDENCE_CURVE_POWER` in `confidence.ts`). The order
and every decision stay the same, 0 and 1 stay where they are, and the
threshold moves along with it: 0.15 on the ranker's score is 0.3859 as a
confidence. A match of 0.28 shows as 63 %, 0.40 as 78 %.

### Long descriptions

Two knobs compensate for the same cause, unmatched words pulling the score
down, but do different jobs. `liftScore` (power 3) only rescales the number for
display: order and decisions are unchanged. `MAX_UNKNOWN_TERMS = 3` changes the
raw score, so it decides which descriptions reach the shortlist.

**PO to confirm:** `MAX_UNKNOWN_TERMS` was tuned on 11 phrases (#421). It
loosens which long, vague descriptions pass, because their extra unmatched
words no longer lower the score. It needs checking on real descriptions.

Words that match no scenario lower the confidence, which separates a
description of a segment from one that only mentions a track. Only the first
three count (`MAX_UNKNOWN_TERMS` in `bm25ranker.ts`). Before that, every extra
word lowered it, so the more detail an operator gave, the lower it scored: the
chatty description of the right segment above scored 0.090 and fell to the full
list. Nothing lowers the confidence further after the third such word, so
"Spor 2 er lukket" (two such words) still scores 0.135.

### includeUnknownTerms

Keep the default `true`. With `false`, every description in the table that
matches any word scored 1.000, "Spor 2 er lukket" and the lowercase codes
included, so no threshold can tell a good match from a vague one. With `true`,
words that match no scenario lower the score, which is what separates a
description of a segment from one that only mentions a track.

## multilingual-e5 as the scorer

`createE5Scorer({ embed, docs })` in `e5-confidence.ts` scores every ranked
scenario with multilingual-e5: the cosine similarity between `query:
<description>` and `passage: <document text>`, from the same documents the
ranker searches. The ranker returns every scenario, so e5 also scores those
BM25 gave 0, and synonyms such as "ingen kørestrøm" for "strømsvigt" can match.
Each scenario is embedded once and kept.

`loadE5Embedder()` in `e5-embedder.ts` runs `Xenova/multilingual-e5-large`, the
ONNX build of `intfloat/multilingual-e5-large`, with Transformers.js on the
CPU, so incident text never leaves the server. `@huggingface/transformers` is
not a dependency yet: install it to use e5. It is loaded on the first call, so
the BM25 default works without it. `E5_MODEL` and `E5_REVISION`
override the model and its revision. Pin the revision to a commit hash, or a
new upload can change every score.

```ts
const scorer = createE5Scorer({ embed: await loadE5Embedder(), docs });
await suggestScenarios(text, docs, {
  ranker,
  scorer,
  threshold: E5_CONFIDENCE_THRESHOLD,
});
```

`E5_CONFIDENCE_THRESHOLD = 0.8` is a placeholder: e5 is not measured yet, and
the evaluation (#421) doesn't cover it for now. e5 places most Danish text
between 0.7 and 0.9, unrelated text included, so it needs its own threshold.
e5 is weak on station
abbreviations such as KGN and on negations ("ikke brand"), where BM25 is
better, and close scores mean a threshold slightly off passes everything or
nothing.

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
