import type { RankedCandidate } from "./types.js";

export const MAX_CANDIDATES = 5;

// The best candidates from a ranked list, at most MAX_CANDIDATES, in the same order.
export function shortlist(ranked: RankedCandidate[]): RankedCandidate[] {
  return ranked.slice(0, MAX_CANDIDATES);
}
