import { test } from "node:test";
import assert from "node:assert/strict";
import { BM25Ranker } from "../../src/services/scenario-suggestion/bm25ranker.ts";

// A fake tokenizer, so these tests don't depend on simpleTokenize
const splitOnSpace = (text) => text.split(" ").filter(Boolean);

test("returns an empty list when there are no documents", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  assert.deepEqual(ranker.rank("ingen strøm", []), []);
});

test("gives every document score 0 for an empty description, ordered by scenarioId", () => {
  const ranker = new BM25Ranker(splitOnSpace);
  const docs = [
    { scenarioId: "DEMO-C", text: "signalfejl kgn kk" },
    { scenarioId: "DEMO-A", text: "ingen strøm kgn kk" },
    { scenarioId: "DEMO-B", text: "sporskiftefejl spor 1" },
  ];

  assert.deepEqual(ranker.rank("", docs), [
    { scenarioId: "DEMO-A", score: 0 },
    { scenarioId: "DEMO-B", score: 0 },
    { scenarioId: "DEMO-C", score: 0 },
  ]);
});

test("uses the injected tokenizer for the description and every document", () => {
  const seen = [];
  const spy = (text) => {
    seen.push(text);
    return splitOnSpace(text);
  };
  const ranker = new BM25Ranker(spy);
  const docs = [
    { scenarioId: "DEMO-A", text: "ingen strøm kgn kk" },
    { scenarioId: "DEMO-B", text: "signalfejl kgn kk" },
  ];

  ranker.rank("ingen strøm", docs);

  assert.deepEqual(seen, [
    "ingen strøm",
    "ingen strøm kgn kk",
    "signalfejl kgn kk",
  ]);
});
