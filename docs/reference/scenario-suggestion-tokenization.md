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
// ["tog", "hold", "stil", "st:for", "st:kn", "spor2"]
```

`stations` is the list of `{ code, name }` from
`docs/scenario-state/stations.json`, or the same from the database. The caller
passes it in, so the function depends only on its arguments: the same text
always gives the same tokens.

`createDanishTokenize` returns a `Tokenize`, `(text: string) => string[]`, the
shape the ranker takes, so it can be passed to it directly.

## What it does, in order

1. **Stations.** Station names and codes become one token: `st:` and the
   station's code in lowercase. "KN", "Nørreport", "nørreport" and
   "Nørreports" are all `st:kn`. Names count in any case, codes only in
   capitals: "FOR" is Forum, while "for" is the word. The prefix keeps plain words apart from stations: "orker"
   stems to `ork`, while Orientkaj is `st:ork`.
   - Names are matched before codes, and the longest name first, so
     "Nørrebros Runddel" is `st:nør`, not `st:nø` followed by "runddel".
   - A name may have a genitive "s" ("Nørreports perron").
   - A name with a typo still counts: "Nørreprot" and "Kongens Nytrov" are
     `st:kn` and `st:kgn`. One edit (a letter added, removed, changed, or two
     neighbouring letters swapped) is accepted in names of 7 letters or more,
     two in one-word names of 12 letters or more. Shorter names need the
     exact spelling, so "form" isn't read as Forum. A typo in the first letter
     counts too ("Mørreport"), also when the letter ended up on the word
     before ("mellemN ørreport"). A typo is only looked for in words that
     aren't stopwords, so "København i dag" isn't København H.
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
- Operators write station codes in capitals (`KN`, `FOR`, `VAN`). In lowercase,
  several codes are also Danish words ("for mange", "ingen lit til", "en van"),
  so a code only counts in capitals. Names count in any case.
- A description names the place by station code or station name.

## Known failure modes

- **Typos in short names and in codes.** A typo is only accepted in names of
  7 letters or more, so "Forrum" isn't recognised, nor is a typo in a code
  ("KNN").
- **Words close to a station name count as the station.** Tested against the
  ordinary (lowercase) words of a Danish dictionary, about 150,000 words, 6
  are read as a station. Five name the place anyway ("frederiksberger",
  "christianshavner", "rådhusplads"); the sixth is "femøre" (Femøren). Place
  names outside the metro can also match ("Frederiksborg" becomes
  Frederiksberg), but operators only describe metro stations.
- **A typo can match the wrong station** when two long names are within the
  allowed edits of each other. None of the current names are (the closest
  pairs are 3 edits apart), but a new station could be.
- **A code in lowercase is never a station.** "kn" or "for" is read as a word,
  even when the operator means the station.
- **Compound words are not split.** "signalfejl" does not match "fejl", and
  "kørestrøm" does not match "strøm".
- **Some forms stem differently.** "evakuering" stays `evakuering`, while
  "evakueret" becomes `evaku`, so they don't match.
- **Synonyms don't match.** "strømsvigt" and "ingen strøm" share no token.
