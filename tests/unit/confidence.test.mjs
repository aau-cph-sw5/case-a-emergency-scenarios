import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyThreshold,
  DEFAULT_CONFIDENCE_THRESHOLD,
  liftScore,
  rankerScore,
  suggestScenarios,
  toConfidence,
} from "../../src/services/scenario-suggestion/confidence.ts";
import { BM25Ranker } from "../../src/services/scenario-suggestion/bm25ranker.ts";

// A fake tokenizer, so these tests don't depend on the real one. The real one
// is measured in confidence-calibration.test.mjs.
const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const ranker = new BM25Ranker(words);

const docs = [
  { scenarioId: "KN-KGN-1", text: "kn kgn spor 1 nørreport kongens nytorv" },
  {
    scenarioId: "KGN-KHC-1",
    text: "kgn khc spor 1 kongens nytorv christianshavn",
  },
  { scenarioId: "FOR-KN-2", text: "for kn spor 2 forum nørreport" },
];

test("toConfidence clamps, rounds and turns non-numbers into 0", () => {
  assert.deepEqual(
    [1.7, -0.2, 1 / 3, Number.NaN, Number.POSITIVE_INFINITY].map(toConfidence),
    [1, 0, 0.3333, 0, 0],
  );
});

test("the default confidence is the ranker's score, lifted by a curve", () => {
  const ranked = [
    { scenarioId: "A", score: 0.42 },
    { scenarioId: "B", score: 0 },
    { scenarioId: "C", score: 1 },
  ];
  // 1 - (1 - 0.42)^3: the order is kept, 0 and 1 stay where they are.
  assert.deepEqual(rankerScore.score("x", ranked), [
    { scenarioId: "A", score: 0.8049 },
    { scenarioId: "B", score: 0 },
    { scenarioId: "C", score: 1 },
  ]);
});

test("the threshold is the ranker's 0.15 on the same curve", () => {
  assert.equal(DEFAULT_CONFIDENCE_THRESHOLD, 0.3859);
});

test("keeps candidates above the threshold, best first, at most five", () => {
  const scored = "GCFAEBD".split("").map((scenarioId, i) => ({
    scenarioId,
    score: i === 0 ? 0.05 : 0.5,
  }));
  assert.deepEqual(applyThreshold(scored), {
    status: "CONFIDENT",
    candidates: "ABCDE".split("").map((scenarioId) => ({
      scenarioId,
      score: 0.5,
    })),
  });
  const reversed = applyThreshold([...scored].reverse());
  assert.deepEqual(reversed, applyThreshold(scored));
});

test("says there is no confident candidate at or below the threshold", () => {
  const score = DEFAULT_CONFIDENCE_THRESHOLD;
  assert.deepEqual(applyThreshold([{ scenarioId: "A", score }]), {
    status: "NO_CONFIDENT_CANDIDATE",
  });
  assert.deepEqual(applyThreshold([]), { status: "NO_CONFIDENT_CANDIDATE" });
});

test("rejects a threshold outside [0, 1)", () => {
  for (const threshold of [-0.1, 1, Number.NaN])
    assert.throws(() => applyThreshold([], threshold), RangeError);
});

test("suggests the matching segment and is deterministic", async () => {
  const description =
    "Signalfejl mellem Kongens Nytorv og Christianshavn spor 1";
  const first = await suggestScenarios(description, docs, { ranker });
  assert.equal(first.status, "CONFIDENT");
  assert.equal(first.candidates[0].scenarioId, "KGN-KHC-1");
  for (let i = 0; i < 10; i++) {
    const again = await suggestScenarios(description, docs, { ranker });
    assert.deepEqual(again, first);
  }
});

test("falls back when the description names no place", async () => {
  const result = await suggestScenarios("Passager med akut sygdom", docs, {
    ranker,
  });
  assert.deepEqual(result, { status: "NO_CONFIDENT_CANDIDATE" });
});

test("another scorer can be swapped in without changing the caller", async () => {
  const reranker = {
    name: "reranker",
    score: async (_d, ranked) =>
      ranked.map((c) => ({
        ...c,
        score: c.scenarioId === "FOR-KN-2" ? 0.9 : 0,
      })),
  };
  const result = await suggestScenarios("x", docs, {
    ranker,
    scorer: reranker,
    threshold: 0.5,
  });
  assert.deepEqual(result, {
    status: "CONFIDENT",
    candidates: [{ scenarioId: "FOR-KN-2", score: 0.9 }],
  });
});

test("rejects a scorer that returns a confidence outside [0, 1]", async () => {
  const broken = {
    name: "uncalibrated",
    threshold: 0.5,
    score: (_d, ranked) => ranked.map((c) => ({ ...c, score: 3 })),
  };
  await assert.rejects(
    suggestScenarios("kgn", docs, { ranker, scorer: broken }),
    /uncalibrated gave .* a confidence of 3/,
  );
});

test("liftScore keeps 0 and 1, rises monotonically and clamps", () => {
  assert.equal(liftScore(0), 0);
  assert.equal(liftScore(1), 1);
  let previous = 0;
  for (let score = 0.05; score <= 1; score += 0.05) {
    const lifted = liftScore(score);
    assert.ok(lifted > previous && lifted >= score);
    previous = lifted;
  }
  assert.equal(liftScore(-0.5), 0);
  assert.equal(liftScore(1.5), 1);
});

test("a scorer without a threshold needs one passed in", async () => {
  const scorer = { name: "bare", score: (_d, ranked) => ranked };
  await assert.rejects(
    suggestScenarios("kgn", docs, { ranker, scorer }),
    /bare has no threshold/,
  );
});
