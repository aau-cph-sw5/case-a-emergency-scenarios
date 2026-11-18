import { test } from "node:test";
import assert from "node:assert/strict";
import { createDanishTokenize } from "../../src/services/scenario-suggestion/danish-tokenize.ts";

// A few real stations; the caller passes the full list from stations.json.
const tokenize = createDanishTokenize([
  { code: "VAN", name: "vanløse" },
  { code: "FB", name: "frederiksberg" },
  { code: "FBA", name: "frederiksberg alle" },
  { code: "FOR", name: "forum" },
  { code: "LIT", name: "lindevang" },
  { code: "KN", name: "nørreport" },
  { code: "KGN", name: "kongens nytorv" },
  { code: "KH", name: "københavn h" },
  { code: "NØ", name: "nørrebro" },
  { code: "NØR", name: "nørrebros runddel" },
  { code: "ØRE", name: "ørestad" },
  { code: "ORK", name: "orientkaj" },
  { code: "RHP", name: "rådhuspladsen" },
  { code: "UNI", name: "DR Byen" },
]);

test("turns a description into stations, the track and stemmed words", () => {
  assert.deepEqual(tokenize("Tog holder stille mellem FOR og KN på spor 2"), [
    "tog",
    "hold",
    "stil",
    "st:for",
    "st:kn",
    "spor2",
  ]);
});

test("gives a station's name and code the same token", () => {
  assert.deepEqual(tokenize("Nørreport"), ["st:kn"]);
  assert.deepEqual(tokenize("nørreport"), ["st:kn"]);
  assert.deepEqual(tokenize("KN"), ["st:kn"]);
});

test("keeps plain words apart from stations, also after stemming", () => {
  // "orker" stems to "ork", the letters of Orientkaj's code.
  assert.deepEqual(tokenize("han orker ikke"), ["ork"]);
  assert.deepEqual(tokenize("Orientkaj"), ["st:ork"]);
});

test("reads codes as stations only in capitals, names in any case", () => {
  assert.deepEqual(tokenize("for mange på Forum"), ["st:for"]);
  assert.deepEqual(tokenize("ingen lit til LIT"), ["ing", "lit", "st:lit"]);
  assert.deepEqual(tokenize("kn øre"), ["kn", "øre"]);
  assert.deepEqual(tokenize("Evakuering af ØRE"), ["evakuering", "st:øre"]);
  assert.deepEqual(tokenize("lindevang og ørestad"), ["st:lit", "st:øre"]);
});

test("matches the longest station name first", () => {
  assert.deepEqual(tokenize("Brand ved Nørrebros Runddel"), [
    "brand",
    "st:nør",
  ]);
  assert.deepEqual(tokenize("Nørrebro"), ["st:nø"]);
  assert.deepEqual(tokenize("Frederiksberg Allé og Frederiksberg"), [
    "st:fba",
    "st:fb",
  ]);
});

test("recognises names of several words, in any case, with a genitive s", () => {
  assert.deepEqual(tokenize("Kongens Nytorv"), ["st:kgn"]);
  assert.deepEqual(tokenize("dr byen"), ["st:uni"]);
  assert.deepEqual(tokenize("Nørreports perron"), ["st:kn", "perron"]);
});

test("recognises a station name with a typo", () => {
  assert.deepEqual(tokenize("Nørreprot"), ["st:kn"]);
  assert.deepEqual(tokenize("Nørreprots perron"), ["st:kn", "perron"]);
  assert.deepEqual(tokenize("Kongens Nytrov"), ["st:kgn"]);
  assert.deepEqual(tokenize("Lindevagn"), ["st:lit"]);
  assert.deepEqual(tokenize("Vanlose"), ["st:van"]);
  // Two edits are allowed in a name of 12 letters or more.
  assert.deepEqual(tokenize("Rådhusplads"), ["st:rhp"]);
});

test("recognises a typo in the first letter, also when it lands on the word before", () => {
  assert.deepEqual(tokenize("Mørreport"), ["st:kn"]);
  assert.deepEqual(tokenize("signalfejl mellemN ørreport"), [
    "signalfejl",
    "mellemn",
    "st:kn",
  ]);
});

test("doesn't turn ordinary words into stations as typos", () => {
  // "Forum" is too short to accept a typo, so "form" stays a word.
  assert.deepEqual(tokenize("form"), ["form"]);
  // A typo can't reach across a stopword: "i" isn't the "h" in København H.
  assert.deepEqual(tokenize("København i dag"), ["københavn", "dag"]);
});

test("keeps lines and joins the track number to 'spor'", () => {
  assert.deepEqual(tokenize("M3 på spor 1"), ["m3", "spor1"]);
  assert.deepEqual(tokenize("fallbackscenarie 1"), ["fallbackscenari", "1"]);
});

test("removes stopwords, including 'mellem' and 'ved'", () => {
  assert.deepEqual(
    tokenize("Der er ingen strøm mellem stationerne og ved perronen"),
    ["ing", "strøm", "station", "perron"],
  );
});

test("stems words so different forms of a word match", () => {
  assert.deepEqual(tokenize("toget togene tog"), ["tog", "tog", "tog"]);
  assert.deepEqual(tokenize("signalfejlen nedbruddet"), [
    "signalfejl",
    "nedbrud",
  ]);
});

test("stems words but never station tokens", () => {
  // "kongens" alone stems to "kong", but as part of the name it is the station.
  assert.deepEqual(tokenize("kongens Kongens Nytorv"), ["kong", "st:kgn"]);
});

test("counts a station once per text, also when both its code and name are there", () => {
  // The text toDocument builds for a scenario has each station's code and name.
  assert.deepEqual(tokenize("VAN FB spor 1 vanløse frederiksberg"), [
    "st:van",
    "st:fb",
    "spor1",
  ]);
});

test("gives the same tokens for the same text, and nothing for empty text", () => {
  const text = "Signalfejl mellem KGN og Nørreprot, M2 spor 1";
  assert.deepEqual(tokenize(text), tokenize(text));
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("  , . og der er "), []);
});
