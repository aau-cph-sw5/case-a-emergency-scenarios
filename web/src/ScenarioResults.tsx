import { filterScenarios } from "./filter-scenarios";
import type { ScenarioSummary } from "./scenarios";
import { routeLabel } from "./suggestion-reasons";

export function ScenarioResults({
  scenarios: all,
  query,
  selectedId,
  activeIds,
  onSelect,
  disabled,
}: {
  scenarios: ScenarioSummary[];
  query: string;
  selectedId: string | null;
  activeIds: ReadonlySet<string>;
  onSelect: (scenarioId: string) => void;
  disabled: boolean;
}) {
  const scenarios = filterScenarios(all, query);
  return (
    <>
      {/* The count confirms the search worked and that nothing is hidden. */}
      <p className="scenario-count" aria-live="polite">
        {query.trim()
          ? `${scenarios.length} af ${all.length} scenarier`
          : `${all.length} scenarier`}
      </p>
      {/* No match is an empty list, not an error. */}
      {scenarios.length === 0 ? (
        <p role="status">Ingen scenarier matcher “{query.trim()}”.</p>
      ) : (
        <ul className="scenario-list">
          {scenarios.map((scenario) => {
            const isSelected = scenario.scenarioId === selectedId;
            const live = activeIds.has(scenario.scenarioId);
            // The yellow background and bold text mark the selection;
            // aria-pressed also exposes it to screen readers.
            return (
              <li key={scenario.scenarioId}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(scenario.scenarioId)}
                  disabled={disabled}
                  className="scenario-option"
                >
                  {scenario.name}
                  {/* The route, so a scenario can be recognised by its stations. */}
                  {scenario.covers && (
                    <small className="scenario-route">
                      {routeLabel(scenario.covers)}
                    </small>
                  )}
                </button>
                {/* A filled green dot when the scenario is live and an empty ring
                when it is not, so it is marked by shape as well as colour. */}
                <span
                  className={
                    live ? "scenario-dot scenario-dot--live" : "scenario-dot"
                  }
                  role="img"
                  aria-label={live ? "Aktiv" : "Ikke aktiv"}
                  title={live ? "Aktiv" : "Ikke aktiv"}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
