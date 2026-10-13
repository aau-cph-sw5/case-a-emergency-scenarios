export type Scenario = any; // shape of the scenario JSON
export type Pattern = any;
export type Requirement = any;

export function currentVersionOf(scenario: Scenario) {
  return scenario.versions.find((v: any) => v.version === scenario.currentVersion);
}

// Turns one pattern into a line: ordered stations -> [A, B] pairs
export function parsePattern(pattern: Pattern) {
  const stations = [...pattern.route]
    .sort((a: any, b: any) => a.sequence - b.sequence)
    .map((step: any) => step.station);

  return {
    name: pattern.routeCode,
    tracks:
      pattern.operationType === 'PENDULUM' ? [Number(pattern.track)] : [1, 2],
    connections: stations.slice(1).map((s: string, i: number) => [stations[i], s] as [string, string]),
  };
}

// scenario JSON -> [{ name, connections }, ...]
export function parseScenario(scenario: Scenario) {
  return currentVersionOf(scenario).operatingPlan.patterns.map(parsePattern);
}

// Turns one stationRequirement into a flat row for the manning list.
// activeDuring is optional; no entry means the station is manned at all times.
export function parseRequirement(req: Requirement) {
  return {
    station: req.station,
    placement: req.placement,
    staff: req.minimumStaffing,
    times: (req.activeDuring ?? []).map(
      (a: any) => `${a.dayPattern} ${a.startTime}-${a.endTime}`
    ),
    actions: [...(req.actions ?? [])]
      .sort((a: any, b: any) => a.sequence - b.sequence)
      .map((a: any) => a.instruction),
  };
}

// scenario JSON -> [{ station, placement, staff, times, actions }, ...]
export function parseStationRequirements(scenario: Scenario) {
  const reqs = currentVersionOf(scenario).stationRequirements ?? [];
  return reqs.map(parseRequirement);
}
