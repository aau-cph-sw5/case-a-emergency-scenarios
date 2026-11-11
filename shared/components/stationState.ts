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
  const enRoute = statuses.filter((s) => s === "PENDING").length;
  return { statuses, current, enRoute };
}

// How much of a station is covered, from 0 (nobody arrived) to 1 (fully
// staffed). A station that needs nobody counts as covered.
export function coverageShare(
  scenario: ActiveDeployments,
  requirement: Pick<StationRequirement, "station" | "minimumStaffing">,
) {
  const needed = requirement.minimumStaffing;
  if (needed === 0) return 1;
  const { current } = getStationState(scenario, requirement.station, needed);
  return Math.min(current, needed) / needed;
}

// Stewards across every required station, for the totals in the header.
// A station counts at most as many arrived stewards as it needs, so an extra
// steward at one station does not hide a missing one at another.
export function countStewards(
  scenario: ActiveDeployments,
  requirements: Pick<StationRequirement, "station" | "minimumStaffing">[],
) {
  let arrived = 0;
  let enRoute = 0;
  let needed = 0;
  for (const r of requirements) {
    const state = getStationState(scenario, r.station, r.minimumStaffing);
    arrived += Math.min(state.current, r.minimumStaffing);
    enRoute += state.enRoute;
    needed += r.minimumStaffing;
  }
  return { arrived, enRoute, needed };
}

// How far a required station is covered right now (MET-A-011): every
// steward needed has arrived, some have, or none has. Stewards on the way do
// not count yet. The coverage cards and the maps both use this rule, so they
// always agree (#310).
export type CoverageLevel = "covered" | "partial" | "gap";

export function coverageLevel(arrived: number, needed: number): CoverageLevel {
  if (arrived >= needed) return "covered";
  return arrived === 0 ? "gap" : "partial";
}

export function stationCoverage(
  requirements: readonly StationRequirement[],
  active: ActiveDeployments,
): Record<string, CoverageLevel> {
  return Object.fromEntries(
    requirements.map(({ station, minimumStaffing }) => [
      station,
      coverageLevel(
        getStationState(active, station, minimumStaffing).current,
        minimumStaffing,
      ),
    ]),
  );
}
