// The measurements DEFAULT_CONFIDENCE_THRESHOLD was chosen on, see
// docs/reference/scenario-suggestion-confidence.md. Invented catalogue: one
// scenario per M1/M2 segment and track. When the ranker or the tokenizer
// changes, this test shows which decisions move and the threshold is chosen
// again.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BM25Ranker } from "../../src/services/scenario-suggestion/bm25ranker.ts";
import { suggestScenarios } from "../../src/services/scenario-suggestion/confidence.ts";
import { createDanishTokenize } from "../../src/services/scenario-suggestion/danish-tokenize.ts";
import { toDocument } from "../../src/services/scenario-suggestion/to-document.ts";

const stations = JSON.parse(
  readFileSync(
    new URL("../../docs/scenario-state/stations.json", import.meta.url),
  ),
);
const ranker = new BM25Ranker(createDanishTokenize(stations));
const name = new Map(stations.map((s) => [s.code, s.name]));
const lines = [
  "VAN FL LIT SOT FB FOR KN KGN KHC AMB LGP ØSV AMS FEØ KSA CPH",
  "KHC ISB UNI KHS BC ØRE VEA",
].map((line) => line.split(" "));
const docs = lines.flatMap((line) =>
  line.slice(1).flatMap((b, i) => {
    const a = line[i];
    return [1, 2].map((trackNumber) =>
      toDocument(
        {
          scenarioId: `${a}-${b}-${trackNumber}`,
          name: `Enkeltsporsdrift ${name.get(a)} - ${name.get(b)}`,
          covers: [{ stationA: a, stationB: b, trackNumber }],
        },
        [name.get(a), name.get(b)],
      ),
    );
  }),
);

// [description, the scenario the shortlist must start with, or null for
// the full list]
const decisions = [
  ["Sporskiftefejl ved Nørreport, spor 1 mod Kongens Nytorv", "KN-KGN-1"],
  ["Signalfejl mellem Kongens Nytorv og Christianshavn spor 1", "KGN-KHC-1"],
  ["Signalfejl mellem Kongens Nytrov og Christianshvan spor 1", "KGN-KHC-1"],
  ["Problem ved KGN spor 1", "KGN-KHC-1"],
  ["Defekt tog spor 2 Ørestad Vestamager", "ØRE-VEA-2"],
  ["Strømsvigt på strækningen VAN FL spor 1", "VAN-FL-1"],
  ["Ingen kørestrøm mellem Frederiksberg og Forum", "FB-FOR-1"],
  ["Tog holder stille mellem FOR og KN på spor 2", "FOR-KN-2"],
  [
    "Der er en person i sporet ved Amagerbro, spor 2 er spærret mod Lergravsparken",
    "AMB-LGP-2",
  ],
  ["Passager med akut sygdom i toget", null],
  ["Der er problemer med elevatoren", null],
  ["Spor 2 er lukket", null],
  // More detail must not lower the confidence: only the first few words that
  // match nothing count (MAX_UNKNOWN_TERMS), so a long description of the same
  // segment still gets it.
  [
    "Hej, vi har lige fået en melding fra føreren om at toget er gået i stå og ikke kan køre videre, det er mellem Christianshavn og Amagerbro på spor 1",
    "KHC-AMB-1",
  ],
  [
    "Nødbremse aktiveret på Forum, toget holder ved perronen spor 1",
    "FB-FOR-1",
  ],
  // Known miss, kept so a change to it is noticed:
  // codes only count in capitals, so lowercase "for" and "kn" name nothing.
  ["tog holder stille mellem for og kn på spor 2", null],
  // only the station matches, so a lexical score cannot tell it apart.
  ["Elevatoren på Nørreport er i stykker", "FOR-KN-1"],
  // every word matches, so it scores 1 although 21 scenarios tie.
  ["Spor 1", "AMB-LGP-1"],
];

for (const [description, expected] of decisions)
  test(`${expected ?? "full list"}: ${description}`, async () => {
    const result = await suggestScenarios(description, docs, { ranker });
    assert.equal(
      result.status === "CONFIDENT" ? result.candidates[0].scenarioId : null,
      expected,
    );
  });
