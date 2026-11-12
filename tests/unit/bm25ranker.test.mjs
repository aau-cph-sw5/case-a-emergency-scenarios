import { test } from "node:test";
import assert from "node:assert/strict";
import { BM25Ranker } from "../../src/services/scenario-suggestion/bm25ranker.ts";

// A fake tokenizer, so these tests don't depend on simpleTokenize
const splitOnSpace = (text) => text.split(" ").filter(Boolean);

const docs = [
  { scenarioId: "DEMO-A", text: "ingen strøm kgn kk" },
  { scenarioId: "DEMO-B", text: "signalfejl strøm kk chr" },
  { scenarioId: "DEMO-C", text: "sporskifte strøm nør" },
];

const ids = (results) => results.map((r) => r.scenarioId);

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

test("ranks the document that matches the description first", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  assert.equal(ranker.rank("ingen strøm", docs)[0].scenarioId, "DEMO-A");
});

test("gives every document score 0 when no words are shared", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  const results = ranker.rank("oversvømmelse", docs);

  assert.equal(results.length, docs.length);
  assert.ok(results.every((r) => r.score === 0));
});

test("ranks a rare shared term above a common one", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  // "strøm" is in every document, "signalfejl" only in DEMO-B.
  assert.equal(ranker.rank("strøm signalfejl", docs)[0].scenarioId, "DEMO-B");
});

test("ranks a shorter document above a longer one with the same match", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  // All three contain "strøm" once. DEMO-C has 3 words, DEMO-A and DEMO-B 4,
  // so DEMO-C comes first and the tie between A and B is ordered by scenarioId.
  assert.deepEqual(ids(ranker.rank("strøm", docs)), [
    "DEMO-C",
    "DEMO-A",
    "DEMO-B",
  ]);
});

test("counts a repeated query word once", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  assert.deepEqual(
    ranker.rank("strøm strøm", docs),
    ranker.rank("strøm", docs),
  );
});

test("gives the same output for the same input", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  assert.deepEqual(
    ranker.rank("ingen strøm", docs),
    ranker.rank("ingen strøm", docs),
  );
});

test("never gives NaN, even for a document with no text", () => {
  const ranker = new BM25Ranker(splitOnSpace);
  const withEmpty = [...docs, { scenarioId: "DEMO-D", text: "" }];

  const results = ranker.rank("ingen strøm", withEmpty);

  assert.ok(results.every((r) => Number.isFinite(r.score)));
  assert.equal(results.at(-1).scenarioId, "DEMO-D");
  assert.equal(results.at(-1).score, 0);
});

test("never gives NaN when every document is empty", () => {
  const ranker = new BM25Ranker(splitOnSpace);
  const empty = [
    { scenarioId: "DEMO-A", text: "" },
    { scenarioId: "DEMO-B", text: "" },
  ];

  assert.deepEqual(ranker.rank("ingen strøm", empty), [
    { scenarioId: "DEMO-A", score: 0 },
    { scenarioId: "DEMO-B", score: 0 },
  ]);
});

// Normalisation to 0..1

// DEMO-B repeats "strøm" and DEMO-A is very short, so both score above the
// best possible before clamping.
const clampDocs = [
  { scenarioId: "DEMO-A", text: "strøm" },
  { scenarioId: "DEMO-B", text: "strøm strøm strøm" },
  { scenarioId: "DEMO-C", text: "signalfejl kgn kk chr nør sporskifte" },
];

test("keeps every score within 0 and 1", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  for (const [description, documents] of [
    ["strøm", clampDocs],
    ["ingen strøm", docs],
    ["ingen strøm xyz", docs],
    ["signalfejl kgn kk", docs],
  ]) {
    for (const { score } of ranker.rank(description, documents)) {
      assert.ok(score >= 0 && score <= 1, `${description}: ${score}`);
    }
  }
});

test("gives 1 to a document of average length that contains the only query term once", () => {
  const ranker = new BM25Ranker(splitOnSpace);
  const sameLength = [
    { scenarioId: "DEMO-A", text: "ingen strøm" },
    { scenarioId: "DEMO-B", text: "signalfejl kk" },
    { scenarioId: "DEMO-C", text: "sporskifte nør" },
  ];

  const [top, ...rest] = ranker.rank("ingen", sameLength);

  assert.equal(top.scenarioId, "DEMO-A");
  assert.ok(Math.abs(top.score - 1) < 1e-9, `score was ${top.score}`);
  assert.ok(rest.every((r) => r.score === 0));
});

test("keeps the stronger match first when two scores are clamped to 1", () => {
  const ranker = new BM25Ranker(splitOnSpace);

  // DEMO-A would win the tie-break by scenarioId, so DEMO-B can only come
  // first if the order was decided by the raw scores before clamping.
  assert.deepEqual(ranker.rank("strøm", clampDocs), [
    { scenarioId: "DEMO-B", score: 1 },
    { scenarioId: "DEMO-A", score: 1 },
    { scenarioId: "DEMO-C", score: 0 },
  ]);
});

test("counts unknown query terms against the score by default", () => {
  const byDefault = new BM25Ranker(splitOnSpace);
  const including = new BM25Ranker(splitOnSpace, { includeUnknownTerms: true });
  const ignoring = new BM25Ranker(splitOnSpace, { includeUnknownTerms: false });

  // "xyz" is in no document.
  const description = "ingen strøm xyz";

  assert.deepEqual(
    byDefault.rank(description, docs),
    including.rank(description, docs),
  );
  assert.ok(
    including.rank(description, docs)[0].score <
      ignoring.rank(description, docs)[0].score,
  );
});

test("ignoring unknown terms scores as if they were not in the description", () => {
  const ranker = new BM25Ranker(splitOnSpace, { includeUnknownTerms: false });

  assert.deepEqual(
    ranker.rank("ingen strøm xyz", docs),
    ranker.rank("ingen strøm", docs),
  );
});

test("gives all scores 0 without NaN when only unknown terms are ignored", () => {
  const ranker = new BM25Ranker(splitOnSpace, { includeUnknownTerms: false });

  assert.deepEqual(ranker.rank("xyz", docs), [
    { scenarioId: "DEMO-A", score: 0 },
    { scenarioId: "DEMO-B", score: 0 },
    { scenarioId: "DEMO-C", score: 0 },
  ]);
});
