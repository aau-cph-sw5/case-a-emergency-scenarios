import type { Scenario } from "../types/v1/scenario";
import type { ScenarioState } from "../types/v1/scenario-state";

export type ActiveDeployments = Pick<ScenarioState, "deployments">;
type StationRequirement =
  Scenario["versions"][number]["stationRequirements"][number];

export function countManned(
  scenario: ActiveDeployments,
  requirements: Pick<StationRequirement, "station" | "minimumStaffing">[],
) {
  return requirements.filter(
    (r) =>
      getStationState(scenario, r.station, r.minimumStaffing).current >=
      r.minimumStaffing,
  ).length;
}

export function getStationState(
  scenario: ActiveDeployments,
  station: string,
  required: number,
) {
  const deployments = scenario.deployments.filter(
    (d) => d.fulfills === station,
  );

  // One status per required steward; missing ones are unmanned
  const statuses = Array.from(
    { length: Math.max(required, deployments.length) },
    (_, i) => deployments[i]?.status ?? "UNMANNED",
  );
  const current = statuses.filter((s) => s === "MANNED").length;
  const lastUpdate = deployments
    .map((d) => d.reportedAt)
    .filter(Boolean)
    .sort()
    .pop();
  return { statuses, current, lastUpdate };
}

export function formatTime(iso?: string | null) {
  if (!iso) return "--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// The stations that require manning in the scenario's current version.
export function currentStations(scenario: Scenario): string[] {
  const version = scenario.versions.find(
    (v) => v.version === scenario.currentVersion,
  );
  return version?.stationRequirements.map((r) => r.station) ?? [];
}

// How old a position report may be before the steward is shown as stale.
export const STALE_AFTER_MS = 5 * 60 * 1000;

// A missing or unreadable report counts as stale, so bad data never looks fresh.
export function isStale(reportedAt: string | null | undefined, now: number) {
  const time = reportedAt ? Date.parse(reportedAt) : Number.NaN;
  return Number.isNaN(time) || now - time > STALE_AFTER_MS;
}
