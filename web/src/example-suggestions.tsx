import type { ScenarioSummary } from "./scenarios";
import { matchedStations } from "./suggestion-reasons";
import type { Suggestions } from "./suggestions";

// TEMPORARY: remove this file when POST /api/v1/scenario-suggestions exists
// (#371). Until then the server answers 404, and the suggestion box shows
// these examples instead, labelled "Eksempel", so the design can be shown
// and tested. They are not the ranker from #355: a scenario scores by the
// share of its stations the description names, which is enough to show
// every state of the box (ranked list, and no confident candidate).
export function exampleSuggestions(
  description: string,
  scenarios: readonly ScenarioSummary[],
): Suggestions {
  const candidates = scenarios
    .map((scenario) => ({
      scenarioId: scenario.scenarioId,
      matched: matchedStations(description, scenario.covers).length,
      stationCount: new Set(
        (scenario.covers ?? []).flatMap((s) => [s.stationA, s.stationB]),
      ).size,
    }))
    .filter((c) => c.matched > 0)
    .map((c) => ({
      scenarioId: c.scenarioId,
      score: Math.round(50 + (45 * c.matched) / c.stationCount) / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (candidates.length === 0) return { status: "NO_CONFIDENT_CANDIDATE" };
  return { status: "CONFIDENT", candidates };
}
