import type { ReactNode } from "react";
import "./OperatorSections.css";
// The operator dashboard is split into three sections: scenario selection, map,
// and steward coverage. OperatorDashboard decides what goes in each.
export function OperatorSections({
  scenarioSelection,
  map,
  coverage,
  mapControls,
  statusPopup,
}: {
  scenarioSelection: ReactNode;
  map: ReactNode;
  coverage: ReactNode;
  mapControls?: ReactNode;
  statusPopup?: ReactNode;
}) {
  return (
    <div className="operator-sections">
      <section className="operator-sidebar" aria-label="Scenario selection">
        {scenarioSelection}
      </section>
      <section className="operator-map-panel" aria-label="Map">
        <div className="map-heading">
          <h1>Oversigt</h1>
          {mapControls}
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
        <div className="operator-coverage-content">
          <h2 className="coverage-heading">Bemandingsplan</h2>
          {coverage}
        </div>
        {statusPopup && (
          <div className="operator-status-footer">
            <div className="status-popup">{statusPopup}</div>
            <button
              type="button"
              className="operator-message-button"
              disabled
              title="Beskeder er endnu ikke tilgængelige"
            >
              Beskeder
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
