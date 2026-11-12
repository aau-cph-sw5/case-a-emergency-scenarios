# Scenario suggestion: search and ranking

An operator describes an incident in free text, for example "Der er ingen
strøm mellem KGN og KK". The server ranks the scenarios in the operator's line
group by how well they match the description.

The ranking only suggests. The operator picks a scenario, and activating it
still goes through the confirmation dialog.

The code is in `src/services/scenario-suggestion/`:

| File                 | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `types.ts`           | `ScenarioRanker`, the interface every ranker implements           |
| `to-document.ts`     | `toDocument`: turns a scenario into the text that is searched     |
| `bm25ranker.ts`      | `BM25Ranker`: ranks the texts against a description               |
| `simple-tokenize.ts` | A stand-in tokenizer, to be replaced by the Danish one from #354 |

## The interface

```ts
interface ScenarioRanker {
  rank(description: string, docs: ScenarioDocument[]): RankedCandidate[];
}
```

`rank` returns every document, best first, each with a score from 0 to 1. The
same input always gives the same output: equal scores are ordered by
`scenarioId`.

A caller only depends on this interface, so another ranker can replace BM25
without changing the caller. `BM25Ranker` takes the tokenizer in its
constructor and uses it for both the description and the documents, so they
are always split into words the same way:

```ts
const ranker = new BM25Ranker(simpleTokenize);
```

## What is searched

`toDocument(scenario, coveredStationNames)` builds one text per scenario from
the parts that say what happened and where:

- the scenario name
- the station codes of the covered segments
- the track numbers, as `spor 1` and `spor 2`, so a bare number such as a
  time doesn't match them
- the names of the covered stations, because operators may write "Kongens
  Nytorv" as well as "KGN". The caller passes them in, because `findScenario`
  returns codes and `getAllScenarios` returns names.

The rest of the scenario is left out:

- the operating plan, its patterns and routes, and the passenger information
  describe the fallback service, that is where trains still run. Matching on
  them would rank a scenario high for stations near the incident instead of at
  it.
- station requirements and actions are instructions for staff.

Each fact appears once. A scenario that covers both tracks, or several
segments in a row, would otherwise repeat its stations and outrank a scenario
that covers one track at the same place. It also keeps the normalisation
below correct, since that assumes a matching word appears once.

For example, a scenario named "Strømsvigt Testby" that covers both tracks
between TBY and PLB becomes:

```text
Strømsvigt Testby TBY PLB spor 1 spor 2 Testby Planby
```

## How BM25 scores

The description and every document are split into words by the tokenizer.
Each word of the description counts once, however often it is repeated, so the
wording of a long description doesn't change the weighting.

**IDF** says how rare a word is among the documents. With N documents, n of
which contain the word:

```text
IDF = ln((N − n + 0.5) / (n + 0.5) + 1)
```

A word in one scenario out of three gets 0.98, a word in all three 0.13. A word
in no scenario gets the highest value, 2.08.

A document's **raw score** is the sum over the description's words that it
contains:

```text
IDF · tf · (k1 + 1) / (tf + k1 · (1 − b + b · |D| / avgdl))
```

- `tf` is how often the word appears in the document
- `|D|` is the document's length in words, `avgdl` the average length
- `k1 = 1.2` limits how much a repeated word helps
- `b = 0.75` lowers the score of documents longer than average, which match
  more words by chance

These are the usual values for BM25.

## Scores from 0 to 1

A document of average length that contains a word once gets exactly that
word's IDF. So the best score a description can expect is the sum of the IDF of
its words, and the ranker divides each raw score by that sum. A score of 0.6
means the document matched about 60% of the weight of the description.

The ranker does not divide by the top result's score. The best candidate would
then always get 1, also when it matches badly, and #356 could never decide that
no candidate is good enough.

A short document, or a word that appears more than once, can score above the
expected best, so scores are capped at 1. The list is sorted before capping, so
two documents capped at 1 keep their order.

`includeUnknownTerms` decides whether words that appear in no scenario count
towards the best score:

- `true` (the default): an unknown word lowers every score. A description that
  is mostly unrecognised gets low scores, and the operator is more likely to
  get the full list instead of a suggestion.
- `false`: unknown words are ignored, as if they were not in the description.

The default is `true` because a wrong suggestion with a high score is worse
than falling back to the full list. Filler words such as "der" and "er" count
as unknown until the tokenizer from #354 removes them.

## Assumptions

- Operators write in Danish.
- A description names the place by station code or station name.
- The scenario name says what kind of incident the scenario is for. The name
  is the only searched text that can, so if names only give the place, the
  ranking matches on place alone.

## Known failure modes

- **Only exact words match.** BM25 doesn't know that two words mean the same,
  so "strømsvigt" doesn't match "ingen kørestrøm". A word that is in no
  scenario's text adds nothing.
- **Numbers have no meaning.** A track number, a switch number and a time are
  all just words.
- **Compound words aren't split** until the tokenizer from #354 is in place.
- **Neighbouring segments share stations.** A description that names one
  station matches every scenario that covers it, with similar scores.
- **IDF is weak with few scenarios.** With a few scenarios, most words are in
  one or all of them. How well the ranking works can't be judged before there
  are more scenarios and the evaluation set from MET-A-020.
- **Scores are relative to the description.** They compare candidates for one
  description. They are not probabilities, and a score for one description
  can't be compared with a score for another.
- **Every call processes all scenarios again.** `rank` splits and counts every
  document each time. That is fast for the number of scenarios a line group
  has, but a large catalogue would need the documents built once and kept.

## Open questions

- The default for `includeUnknownTerms`, and whether the threshold in #356
  works with these scores (Oskar).
- Whether the tokenizer from #354 removes filler words, which makes
  `includeUnknownTerms: true` less strict.
- The fields that are left out can be tried again once MET-A-020 can measure
  the difference.
