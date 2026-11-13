import { test } from "node:test";
import assert from "node:assert/strict";
import { simpleTokenize } from "../../src/services/scenario-suggestion/simple-tokenize.ts";

test("lowercases and keeps æøå", () => {
  assert.deepEqual(simpleTokenize("Ingen strøm mellem KGN og KK"), [
    "ingen",
    "strøm",
    "mellem",
    "kgn",
    "og",
    "kk",
  ]);
});

test("drops punctuation and extra spaces without leaving empty tokens", () => {
  assert.deepEqual(simpleTokenize("  Signalfejl,  KGN–KK!  "), [
    "signalfejl",
    "kgn",
    "kk",
  ]);
});

test("keeps digits", () => {
  assert.deepEqual(simpleTokenize("spor 1"), ["spor", "1"]);
});

test("returns no tokens for empty text or only punctuation", () => {
  assert.deepEqual(simpleTokenize(""), []);
  assert.deepEqual(simpleTokenize(" ,.! "), []);
});
