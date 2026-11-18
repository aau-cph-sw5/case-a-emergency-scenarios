# Scenario suggestion: tokenization

An operator describes an incident in Danish, for example "Tog holder stille
mellem FOR og KN på spor 2". Before the description can be compared with the
scenarios, it is split into tokens: the words that search compares exactly.
The same tokenizer is used for the description and for each scenario's text,
so both sides are split the same way (MET-A-019, #354).

The code is `createDanishTokenize` in
`src/services/scenario-suggestion/danish-tokenize.ts`.

## Using it

```ts
const tokenize = createDanishTokenize(stations);
tokenize("Tog holder stille mellem FOR og KN på spor 2");
// ["tog", "hold", "stil", "for", "kn", "spor2"]
```

`stations` is the list of `{ code, name }` from
`docs/scenario-state/stations.json`, or the same from the database. The caller
passes it in, so the function depends only on its arguments: the same text
always gives the same tokens.

`createDanishTokenize` returns a `Tokenize`, `(text: string) => string[]`, the
shape the ranker takes, so it can be passed to it directly.

## What it does, in order

1. **Stations.** Station names and codes become one token: the station's code
   in lowercase. "KN", "kn", "Nørreport" and "Nørreports" are all `kn`.
   - Names are matched before codes, and the longest name first, so
     "Nørrebros Runddel" is `nør`, not `nø` followed by "runddel".
   - A name may have a genitive "s" ("Nørreports perron").
   - A station counts once per text. A scenario's text contains both a
     station's code and its name, which become the same token, and would
     otherwise count twice.
2. **Words.** The rest is lowercased and split on anything that isn't a letter
   or a digit. "spor 1" becomes `spor1`, so the number can't match a number in
   a scenario name such as "fallbackscenarie 1". Lines stay as they are: `m3`.
3. **Stopwords.** Words that say nothing about the incident are removed: the
   Danish Snowball stopword list, plus "mellem" and "ved", which describe
   where but name no place. They are in no scenario's text, so without this
   they would lower every scenario's score.
4. **Stemming.** The remaining words are cut to their stem with the Danish
   Snowball stemmer (the `snowball-stemmers` package), so different forms of
   a word match: "togene", "toget" and "tog" are all `tog`. Station tokens,
   numbers and `spor1` are not stemmed. Stations are found before stemming,
   because "kongens" alone stems to `kong`.

## Assumptions

- Operators write in Danish, on Danish keyboards, so station names are written
  with æ, ø and å. Other accents are dropped, so "Frederiksberg Allé" matches
  "frederiksberg alle".
- `FOR` means Forum only in capitals. In lowercase, "for" is the common Danish
  word ("for mange", "for længe") and is removed as a stopword. "Forum" works
  in any case. All other codes count in any case.
- A description names the place by station code or station name.

## Known failure modes

- **Typos and missing æ, ø and å.** "Nørreprot" and "Norreport" are not
  recognised as Nørreport.
- **"for" in lowercase is never Forum**, even when the operator means it.
- **Compound words are not split.** "signalfejl" does not match "fejl", and
  "kørestrøm" does not match "strøm".
- **Some forms stem differently.** "evakuering" stays `evakuering`, while
  "evakueret" becomes `evaku`, so they don't match.
- **Synonyms don't match.** "strømsvigt" and "ingen strøm" share no token.
