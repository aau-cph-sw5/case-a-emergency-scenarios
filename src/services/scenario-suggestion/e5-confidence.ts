import { toConfidence, type ConfidenceScorer } from "./confidence.js";
import type { ScenarioDocument } from "./types.js";

// Re-scores the ranking with multilingual-e5 (MET-A-019, #356): the confidence
// is the cosine similarity between the description and each scenario's text.
// The ranker returns every scenario, so e5 also sees those BM25 scored 0.
// See docs/reference/scenario-suggestion-confidence.md.

// Turns texts into embeddings, one vector per text, in the same order. Must be
// deterministic: a pinned model on the CPU, no sampling.
export type Embedder = (texts: string[]) => Promise<number[][]>;

// A placeholder: e5 is not measured yet, and the evaluation (#421) doesn't
// cover it for now. e5 puts most Danish text between 0.7 and 0.9, so the BM25
// threshold would pass everything.
export const E5_CONFIDENCE_THRESHOLD = 0.8;

// e5 was trained with these prefixes and loses accuracy without them.
const QUERY_PREFIX = "query: ";
const PASSAGE_PREFIX = "passage: ";

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length)
    throw new Error(`Embedding lengths differ: ${a.length} and ${b.length}`);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

// `docs` are the documents the ranker searches (toDocument). A candidate
// without one gets confidence 0. Each scenario is embedded once and kept.
export function createE5Scorer({
  embed,
  docs,
}: {
  embed: Embedder;
  docs: ScenarioDocument[];
}): ConfidenceScorer {
  const texts = new Map(docs.map((d) => [d.scenarioId, d.text]));
  const vectors = new Map<string, Promise<number[]>>();

  function passageVector(scenarioId: string, text: string): Promise<number[]> {
    let vector = vectors.get(scenarioId);
    if (!vector) {
      vector = embed([PASSAGE_PREFIX + text]).then(([v]) => v);
      // A failed embedding is not kept, so the next request tries again.
      vector.catch(() => vectors.delete(scenarioId));
      vectors.set(scenarioId, vector);
    }
    return vector;
  }

  return {
    name: "multilingual-e5",
    async score(description, ranked) {
      const [query] = await embed([QUERY_PREFIX + description.trim()]);
      return Promise.all(
        ranked.map(async ({ scenarioId }) => {
          const text = texts.get(scenarioId);
          const score = text
            ? toConfidence(cosine(query, await passageVector(scenarioId, text)))
            : 0;
          return { scenarioId, score };
        }),
      );
    },
  };
}
