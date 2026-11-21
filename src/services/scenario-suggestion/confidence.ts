import { shortlist } from "./shortlist.js";
import type {
  RankedCandidate,
  ScenarioDocument,
  ScenarioRanker,
} from "./types.js";

// Decides whether the ranking is good enough to show, or the operator should
// get the full scenario list (MET-A-019, #356). The shape is the response of
// POST /api/v1/scenario-suggestions (#357); `score` is the confidence.
// See docs/reference/scenario-suggestion-confidence.md.
export type ScenarioSuggestion =
  | { status: "CONFIDENT"; candidates: RankedCandidate[] }
  | { status: "NO_CONFIDENT_CANDIDATE" };

// Gives each candidate a confidence in [0, 1], the number the threshold is
// applied to. Must be deterministic: the same input gives the same scores. A
// model that re-scores the candidates (e5, Laya) implements this, with
// calibrated scores and its own threshold.
export interface ConfidenceScorer {
  readonly name: string;
  score(
    description: string,
    ranked: RankedCandidate[],
  ): RankedCandidate[] | Promise<RankedCandidate[]>;
}

// Provisional until the evaluation (#421) measures it. Chosen on the
// measurements in the reference doc, with the Danish tokenizer (#354) and
// includeUnknownTerms: true.
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.15;

// Clamps to [0, 1] and rounds to four decimals, so float noise cannot flip a
// decision and the value is stable in JSON.
export function toConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
}

// The default: the ranker's score, which #355 already normalises to 0..1.
export const rankerScore: ConfidenceScorer = {
  name: "bm25",
  score: (_description, ranked) =>
    ranked.map(({ scenarioId, score }) => ({
      scenarioId,
      score: toConfidence(score),
    })),
};

// Highest first; equal scores fall back to the scenario id, so the result
// never depends on the order a scorer returns.
function byScoreThenId(a: RankedCandidate, b: RankedCandidate): number {
  return (
    b.score - a.score ||
    (a.scenarioId < b.scenarioId ? -1 : a.scenarioId > b.scenarioId ? 1 : 0)
  );
}

// Keeps the candidates whose confidence exceeds the threshold, at most five.
// When none does, it says so instead of returning a poor ranking.
export function applyThreshold(
  scored: RankedCandidate[],
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
): ScenarioSuggestion {
  if (!(threshold >= 0 && threshold < 1))
    throw new RangeError(`threshold must be in [0, 1), got ${threshold}`);
  const confident = shortlist(
    scored.filter((c) => c.score > threshold).sort(byScoreThenId),
  );
  return confident.length
    ? { status: "CONFIDENT", candidates: confident }
    : { status: "NO_CONFIDENT_CANDIDATE" };
}

// The caller builds the ranker, the same way the ranker takes its tokenizer,
// so this file needs no station list:
// new BM25Ranker(createDanishTokenize(stations)).
export async function suggestScenarios(
  description: string,
  docs: ScenarioDocument[],
  {
    ranker,
    scorer = rankerScore,
    threshold = DEFAULT_CONFIDENCE_THRESHOLD,
  }: {
    ranker: ScenarioRanker;
    scorer?: ConfidenceScorer;
    threshold?: number;
  },
): Promise<ScenarioSuggestion> {
  const scored = await scorer.score(
    description,
    ranker.rank(description, docs),
  );
  for (const { scenarioId, score } of scored) {
    if (!(score >= 0 && score <= 1))
      throw new RangeError(
        `${scorer.name} gave ${scenarioId} a confidence of ${score}`,
      );
  }
  return applyThreshold(scored, threshold);
}
