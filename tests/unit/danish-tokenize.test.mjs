import { test } from "node:test";
import assert from "node:assert/strict";
import { createDanishTokenize } from "../../src/services/scenario-suggestion/danish-tokenize.ts";

// A few real stations; the caller passes the full list from stations.json.
const tokenize = createDanishTokenize([
  { code: "VAN", name: "vanløse" },
  { code: "FB", name: "frederiksberg" },
  { code: "FBA", name: "frederiksberg alle" },
  { code: "FOR", name: "forum" },
  { code: "KN", name: "nørreport" },
  { code: "KGN", name: "kongens nytorv" },
  { code: "NØ", name: "nørrebro" },
  { code: "NØR", name: "nørrebros runddel" },
  { code: "ØRE", name: "ørestad" },
  { code: "UNI", name: "DR Byen" },
]);

test("turns station codes and the track into tokens", () => {
  assert.deepEqual(tokenize("Tog holder stille mellem FOR og KN på spor 2"), [
    "tog",
    "holder",
    "stille",
    "mellem",
    "for",
    "og",
    "kn",
    "på",
    "spor2",
  ]);
});

test("gives a station's name and code the same token", () => {
  assert.deepEqual(tokenize("Nørreport"), ["kn"]);
  assert.deepEqual(tokenize("KN"), ["kn"]);
  assert.deepEqual(tokenize("kn"), ["kn"]);
});

test("reads 'for' in lowercase as the word and drops it, and only FOR as Forum", () => {
  assert.deepEqual(tokenize("for mange på Forum"), ["mange", "på", "for"]);
  assert.deepEqual(tokenize("Tog holder for længe ved FOR"), [
    "tog",
    "holder",
    "længe",
    "ved",
    "for",
  ]);
});

test("reads ØRE as Ørestad in any case", () => {
  assert.deepEqual(tokenize("Evakuering af ØRE"), ["evakuering", "af", "øre"]);
  assert.deepEqual(tokenize("øre"), ["øre"]);
});

test("matches the longest station name first", () => {
  assert.deepEqual(tokenize("Brand ved Nørrebros Runddel"), [
    "brand",
    "ved",
    "nør",
  ]);
  assert.deepEqual(tokenize("Nørrebro"), ["nø"]);
  assert.deepEqual(tokenize("Frederiksberg Allé og Frederiksberg"), [
    "fba",
    "og",
    "fb",
  ]);
});

test("recognises names of several words, in any case, with a genitive s", () => {
  assert.deepEqual(tokenize("Kongens Nytorv"), ["kgn"]);
  assert.deepEqual(tokenize("dr byen"), ["uni"]);
  assert.deepEqual(tokenize("Nørreports perron"), ["kn", "perron"]);
});

test("keeps lines and joins the track number to 'spor'", () => {
  assert.deepEqual(tokenize("M3 på spor 1"), ["m3", "på", "spor1"]);
  assert.deepEqual(tokenize("fallbackscenarie 1"), ["fallbackscenarie", "1"]);
});

test("counts a station once per text, also when both its code and name are there", () => {
  // The text toDocument builds for a scenario has each station's code and name.
  assert.deepEqual(tokenize("VAN FB spor 1 vanløse frederiksberg"), [
    "van",
    "fb",
    "spor1",
  ]);
});

test("gives the same tokens for the same text, and nothing for empty text", () => {
  const text = "Signalfejl mellem KGN og KN, M2 spor 1";
  assert.deepEqual(tokenize(text), tokenize(text));
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("  , . "), []);
});
