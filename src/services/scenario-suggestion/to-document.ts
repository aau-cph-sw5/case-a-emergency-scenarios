import type { Scenario } from "../../../shared/types/v1/scenario.js";
import type { ScenarioDocument } from "./types.js";

// Only the name and the covered segments, each fact once, so repeats can't
// raise the score. See docs/reference/scenario-suggestion.md for why.
export function toDocument(
  scenario: Scenario,
  coveredStationNames: string[],
): ScenarioDocument {
  const covers = scenario.covers ?? [];
  const stationCodes = new Set(
    covers.flatMap((segment) => [segment.stationA, segment.stationB]),
  );
  const tracks = new Set(
    covers.map((segment) => `spor ${segment.trackNumber}`),
  );

  const parts = [
    scenario.name,
    ...stationCodes,
    ...tracks,
    ...new Set(coveredStationNames),
  ];

  return {
    scenarioId: scenario.scenarioId,
    text: parts.filter(Boolean).join(" "),
  };
}
