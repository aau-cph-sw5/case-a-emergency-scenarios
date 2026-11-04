import type { ReactNode } from "react";
import "./OperatorSections.css";
// The operator dashboard is split into three sections: scenario selection, map,
// and steward coverage. OperatorDashboard decides what goes in each.
export function OperatorSections({
  scenarioSelection,
  map,
  coverage,
}: {
  scenarioSelection: ReactNode;
  map: ReactNode;
  coverage: ReactNode;
}) {
  return (
    <div className="operator-sections">
      <section className="operator-sidebar" aria-label="Scenario selection">
        {scenarioSelection}
      </section>
      <section className="operator-map-panel" aria-label="Map">
        <div className="map-heading">
          <h1>Bemanding på stationerne</h1>
        </div>
        <div className="map-legend" aria-label="Kortforklaring">
          <span>
            <i className="legend-required" />
            Bemandingsbehov
          </span>
          <span>
            <i className="legend-blocked" />
            Spærret spor
          </span>
        </div>
        <div className="operator-map-frame">{map}</div>
      </section>
      <section
        className="operator-coverage-panel"
        aria-label="Steward coverage"
      >
        {coverage}
      </section>
    </div>
  );
}
