import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createE5Scorer,
  E5_CONFIDENCE_THRESHOLD,
} from "../../src/services/scenario-suggestion/e5-confidence.ts";
import { suggestScenarios } from "../../src/services/scenario-suggestion/confidence.ts";
import { BM25Ranker } from "../../src/services/scenario-suggestion/bm25ranker.ts";

const docs = [
  { scenarioId: "KGN-KHC-1", text: "kongens nytorv christianshavn spor 1" },
  { scenarioId: "KN-KGN-2", text: "nørreport kongens nytorv spor 2" },
  { scenarioId: "FOR-KN-1", text: "forum nørreport spor 1" },
];

// A fake e5: each text maps to a fixed vector, so the cosine is known.
const vectors = {
  "query: røg i tunnelen ved KGN": [1, 0, 0],
  "query: passager med akut sygdom": [0, 0, 1],
  "passage: kongens nytorv christianshavn spor 1": [0.9, Math.sqrt(0.19), 0],
  "passage: nørreport kongens nytorv spor 2": [0.6, 0.8, 0],
  "passage: forum nørreport spor 1": [0, 1, 0],
};

function fakeEmbedder() {
  const calls = [];
  const embed = async (texts) => {
    calls.push(...texts);
    return texts.map((t) => {
      if (!vectors[t]) throw new Error(`no vector for ${t}`);
      return vectors[t];
    });
  };
  return { embed, calls };
}

const ranked = docs.map(({ scenarioId }) => ({ scenarioId, score: 0 }));

test("confidence is the cosine between the description and the scenario", async () => {
  const scorer = createE5Scorer({ ...fakeEmbedder(), docs });
  assert.deepEqual(await scorer.score(" røg i tunnelen ved KGN ", ranked), [
    { scenarioId: "KGN-KHC-1", score: 0.9 },
    { scenarioId: "KN-KGN-2", score: 0.6 },
    { scenarioId: "FOR-KN-1", score: 0 },
  ]);
});

test("uses the e5 prefixes and embeds each scenario once", async () => {
  const fake = fakeEmbedder();
  const scorer = createE5Scorer({ ...fake, docs });
  const first = await scorer.score("røg i tunnelen ved KGN", ranked);
  const second = await scorer.score("røg i tunnelen ved KGN", ranked);
  assert.deepEqual(second, first);
  assert.ok(fake.calls.every((t) => /^(query|passage): /.test(t)));
  assert.equal(fake.calls.filter((t) => t.startsWith("passage")).length, 3);
});

test("a candidate without a document gets confidence 0", async () => {
  const scorer = createE5Scorer({ ...fakeEmbedder(), docs });
  const unknown = [{ scenarioId: "UNKNOWN", score: 1 }];
  assert.deepEqual(await scorer.score("røg i tunnelen ved KGN", unknown), [
    { scenarioId: "UNKNOWN", score: 0 },
  ]);
});

test("suggests above the e5 threshold, also what BM25 scored 0", async () => {
  const scorer = createE5Scorer({ ...fakeEmbedder(), docs });
  const ranker = new BM25Ranker((text) => text.split(" "));
  const options = { ranker, scorer, threshold: E5_CONFIDENCE_THRESHOLD };
  const fire = await suggestScenarios("røg i tunnelen ved KGN", docs, options);
  assert.deepEqual(fire, {
    status: "CONFIDENT",
    candidates: [{ scenarioId: "KGN-KHC-1", score: 0.9 }],
  });
  const ill = await suggestScenarios("passager med akut sygdom", docs, options);
  assert.deepEqual(ill, { status: "NO_CONFIDENT_CANDIDATE" });
});

test("a failed scenario embedding is retried on the next request", async () => {
  let fail = true;
  const fake = fakeEmbedder();
  const embed = (texts) =>
    fail && texts[0].startsWith("passage")
      ? Promise.reject(new Error("model not loaded"))
      : fake.embed(texts);
  const scorer = createE5Scorer({ embed, docs });
  const one = [ranked[0]];
  await assert.rejects(scorer.score("røg i tunnelen ved KGN", one));
  fail = false;
  const [retried] = await scorer.score("røg i tunnelen ved KGN", one);
  assert.equal(retried.score, 0.9);
});

test("rejects embeddings of different lengths and scores zero vectors 0", async () => {
  const mismatched = async (texts) =>
    texts.map((t) => (t.startsWith("query") ? [1, 0] : [1, 0, 0]));
  const zero = async (texts) => texts.map(() => [0, 0, 0]);
  await assert.rejects(
    createE5Scorer({ embed: mismatched, docs }).score("x", [ranked[0]]),
    /lengths differ: 2 and 3/,
  );
  const [scored] = await createE5Scorer({ embed: zero, docs }).score("x", [
    ranked[0],
  ]);
  assert.equal(scored.score, 0);
});
