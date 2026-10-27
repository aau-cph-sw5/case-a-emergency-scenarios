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
      <section aria-label="Scenario selection">{scenarioSelection}</section>
      <section aria-label="Map">{map}</section>
      <section aria-label="Steward coverage">{coverage}</section>
    </div>
  );
}
