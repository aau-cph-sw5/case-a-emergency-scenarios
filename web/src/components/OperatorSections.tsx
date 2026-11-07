import type { ReactNode } from "react";
import "./OperatorSections.css";
// The operator dashboard is the map with the scenario controls floating on
// it, and a right column with the staffing plan and, while a scenario is
// live, the status log. ScenarioWorkspace decides what goes in each.
export function OperatorSections({
  scenarioSelection,
  map,
  coverage,
  mapControls,
  statusLog,
}: {
  scenarioSelection: ReactNode;
  map: ReactNode;
  coverage: ReactNode;
  mapControls?: ReactNode;
  statusLog?: ReactNode;
}) {
  return (
    <div className="operator-sections">
      <section className="operator-map-panel" aria-label="Map">
        <h1 className="visually-hidden">Oversigt</h1>
        <div className="operator-map-frame">{map}</div>
        <div className="operator-map-overlay">{scenarioSelection}</div>
        {mapControls}
        <div className="map-legend" aria-label="Kortforklaring">
          <span>
            <i className="legend-required" />
            Bemandingsbehov (tal = krævede stewards)
          </span>
          <span>
            <i className="legend-blocked" />
            Spærret spor
          </span>
        </div>
      </section>
      <section
        className="operator-coverage-panel"
        aria-label="Steward coverage"
      >
        <div className="operator-coverage-content">
          <h2 className="coverage-heading">Bemandingsplan</h2>
          {coverage}
        </div>
        {statusLog && <div className="operator-status-log">{statusLog}</div>}
      </section>
    </div>
  );
}
