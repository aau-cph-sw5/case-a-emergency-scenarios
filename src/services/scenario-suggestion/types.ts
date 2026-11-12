export type Tokenize = (text: string) => string[];

export type ScenarioDocument = {
  scenarioId: string;
  text: string;
};

export type RankedCandidate = {
  scenarioId: string;
  /** 0..1 relative to the query */
  score: number;
};

export interface ScenarioRanker {
  /** returns all documents, best first, and it is deterministic. */
  rank(description: string, docs: ScenarioDocument[]): RankedCandidate[];
}
