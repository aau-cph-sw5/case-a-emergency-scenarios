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
// steward needed has arrived, or some have, or none has. Arrived stewards are
// what counts as covered; someone on the way only lifts a red station to
// yellow. The coverage cards, the overview and the maps all use this rule, so
// they always agree (#310).
export type CoverageLevel = "covered" | "partial" | "gap";

// Someone on the way makes an empty station yellow instead of red.
export function coverageLevel(
  arrived: number,
  needed: number,
  enRoute = 0,
): CoverageLevel {
  if (arrived >= needed) return "covered";
  return arrived === 0 && enRoute === 0 ? "gap" : "partial";
}

// How tight the operator rows are, so every station fits at once.
export type Density = "roomy" | "snug" | "tight";

export function densityFor(stationCount: number): Density {
  if (stationCount <= 8) return "roomy";
  return stationCount <= 14 ? "snug" : "tight";
}

export function levelFor(
  active: ActiveDeployments,
  station: string,
  needed: number,
): CoverageLevel {
  const { current, enRoute } = getStationState(active, station, needed);
  return coverageLevel(current, needed, enRoute);
}

export function stationCoverage(
  requirements: readonly StationRequirement[],
  active: ActiveDeployments,
): Record<string, CoverageLevel> {
  return Object.fromEntries(
    requirements.map(({ station, minimumStaffing }) => [
      station,
      levelFor(active, station, minimumStaffing),
    ]),
  );
}
