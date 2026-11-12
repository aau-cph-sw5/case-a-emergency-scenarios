import {
  type RankedCandidate,
  type ScenarioDocument,
  type ScenarioRanker,
  type Tokenize,
} from "./types.js";

export class BM25Ranker implements ScenarioRanker {
  private readonly tokenize: Tokenize;

  constructor(tokenize: Tokenize) {
    this.tokenize = tokenize;
  }

  rank(description: string, docs: ScenarioDocument[]): RankedCandidate[] {
    if (docs.length === 0) {
      return [];
    }

    this.tokenize(description);

    const results: RankedCandidate[] = [];

    for (const doc of docs) {
      this.tokenize(doc.text);
      results.push({ scenarioId: doc.scenarioId, score: 0 });
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
