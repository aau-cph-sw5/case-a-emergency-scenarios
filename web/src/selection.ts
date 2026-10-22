import type { ScenarioSummary } from "./scenarios";

// The selection stays until the operator picks another scenario, or the
// selected one is no longer in the loaded list (#182). Searching only hides
// scenarios, so it does not count as the scenario disappearing.
export function keepSelection(
  selectedId: string | null,
  scenarios: ScenarioSummary[],
): string | null {
  if (selectedId === null) return null;
  return scenarios.some((scenario) => scenario.scenarioId === selectedId)
    ? selectedId
    : null;
}

// The activate button acts on the selected scenario, so it is disabled when
// nothing is selected or while an activation is already in progress (#182).
export function canActivate(
  selectedId: string | null,
  activating: boolean,
): boolean {
  return selectedId !== null && !activating;
}
