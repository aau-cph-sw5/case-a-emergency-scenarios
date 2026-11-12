import {
  type RankedCandidate,
  type ScenarioDocument,
  type ScenarioRanker,
  type Tokenize,
} from "./types.js";

const K1 = 1.2; // caps how much repeating a term helps
const B = 0.75; // how strongly long documents are pushed down

export class BM25Ranker implements ScenarioRanker {
  private readonly tokenize: Tokenize;

  constructor(tokenize: Tokenize) {
    this.tokenize = tokenize;
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

    const idf = new Map<string, number>();
    for (const term of queryTerms) {
      const df = indexed.filter((doc) => doc.counts.has(term)).length;
      idf.set(term, Math.log((indexed.length - df + 0.5) / (df + 0.5) + 1));
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

    return results.sort(byScoreThenId);
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
