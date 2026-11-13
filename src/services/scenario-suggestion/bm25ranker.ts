import {
  type RankedCandidate,
  type ScenarioDocument,
  type ScenarioRanker,
  type Tokenize,
} from "./types.js";

const K1 = 1.2; // caps how much repeating a term helps
const B = 0.75; // how strongly long documents are pushed down

export type Bm25Options = {
  /** Count query terms found in no document towards the best possible score. */
  includeUnknownTerms?: boolean;
};

export class BM25Ranker implements ScenarioRanker {
  private readonly tokenize: Tokenize;
  private readonly includeUnknownTerms: boolean;

  constructor(tokenize: Tokenize, options: Bm25Options = {}) {
    this.tokenize = tokenize;
    this.includeUnknownTerms = options.includeUnknownTerms ?? true;
  }

  rank(description: string, docs: ScenarioDocument[]): RankedCandidate[] {
    if (docs.length === 0) {
      return [];
    }

    const queryTerms = [...new Set(this.tokenize(description))];

    const indexed = docs.map((doc) => {
      const terms = this.tokenize(doc.text);
      return {
        scenarioId: doc.scenarioId,
        counts: countTerms(terms),
        length: terms.length,
      };
    });

    const avgdl =
      indexed.reduce((sum, doc) => sum + doc.length, 0) / indexed.length;

    // The best possible score is what a document of average length gets when it
    // contains every counted query term once: the sum of their IDFs.
    const idf = new Map<string, number>();
    let bestPossible = 0;
    for (const term of queryTerms) {
      const df = indexed.filter((doc) => doc.counts.has(term)).length;
      const termIdf = Math.log((indexed.length - df + 0.5) / (df + 0.5) + 1);
      idf.set(term, termIdf);
      if (df > 0 || this.includeUnknownTerms) {
        bestPossible += termIdf;
      }
    }

    const results: RankedCandidate[] = [];
    for (const doc of indexed) {
      let score = 0;
      for (const term of queryTerms) {
        const tf = doc.counts.get(term) ?? 0;
        if (tf === 0) continue; // also avoids 0/0 when every document is empty
        const termIdf = idf.get(term) ?? 0;
        score +=
          (termIdf * (tf * (K1 + 1))) /
          (tf + K1 * (1 - B + B * (doc.length / avgdl)));
      }
      results.push({ scenarioId: doc.scenarioId, score });
    }

    // Sort on the raw scores first: clamping can turn two different scores into 1, and the stronger match should still come first.
    results.sort(byScoreThenId);

    // No counted query terms means every raw score is 0. Returns them as they are instead of dividing by 0.
    if (bestPossible === 0) {
      return results;
    }

    // A repeated term or a short document can score above the best possible, so clamp to 1.
    return results.map((result) => ({
      scenarioId: result.scenarioId,
      score: Math.min(1, result.score / bestPossible),
    }));
  }
}

function byScoreThenId(a: RankedCandidate, b: RankedCandidate): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  if (a.scenarioId < b.scenarioId) {
    return -1;
  }
  if (a.scenarioId > b.scenarioId) {
    return 1;
  }
  return 0;
}

function countTerms(terms: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const term of terms) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
}
