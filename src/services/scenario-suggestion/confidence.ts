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
  /** The threshold on this scorer's scale; a caller can still pass its own. */
  readonly threshold?: number;
  score(
    description: string,
    ranked: RankedCandidate[],
  ): RankedCandidate[] | Promise<RankedCandidate[]>;
}

// Provisional until the evaluation (#421) measures it. Chosen on the
// measurements in the reference doc, with the Danish tokenizer (#354) and
// includeUnknownTerms: true. This is the threshold on the ranker's own 0..1
// score; DEFAULT_CONFIDENCE_THRESHOLD below is the same cut on the lifted scale.
const RANKER_THRESHOLD = 0.15;

// A right match scores 0.3 to 0.5 from the ranker, because even a short
// description has a few words that match no scenario and those count towards
// the best possible score. Shown as a percentage that reads as a poor match.
// So the confidence is the ranker's score lifted by a curve: it keeps the
// order and the decisions, and 0 and 1 stay where they are. The threshold
// moves along with it. Tune the power, not the ranker, if it reads too low or
// too high.
// Two knobs fix the same low scores and do different jobs: this curve only
// rescales the number for display (order and decisions unchanged), while
// MAX_UNKNOWN_TERMS in bm25ranker.ts changes which descriptions pass at all, by
// capping how far unmatched words can pull the raw score down.
export const CONFIDENCE_CURVE_POWER = 3;
export function liftScore(score: number): number {
  return 1 - (1 - Math.min(1, Math.max(0, score))) ** CONFIDENCE_CURVE_POWER;
}

// Clamps to [0, 1] and rounds to four decimals, so float noise cannot flip a
// decision and the value is stable in JSON.
export function toConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
}

// Only meaningful on rankerScore's lifted scale: another scorer carries its own
// `threshold`, and suggestScenarios refuses to guess one for it.
export const DEFAULT_CONFIDENCE_THRESHOLD = toConfidence(
  liftScore(RANKER_THRESHOLD),
);

// The default: the ranker's score, which #355 already normalises to 0..1.
export const rankerScore: ConfidenceScorer = {
  name: "bm25",
  threshold: DEFAULT_CONFIDENCE_THRESHOLD,
  score: (_description, ranked) =>
    ranked.map(({ scenarioId, score }) => ({
      scenarioId,
      score: toConfidence(liftScore(score)),
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
    threshold = scorer.threshold,
  }: {
    ranker: ScenarioRanker;
    scorer?: ConfidenceScorer;
    threshold?: number;
  },
): Promise<ScenarioSuggestion> {
  if (threshold === undefined)
    throw new RangeError(`${scorer.name} has no threshold; pass one`);
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
