export type Scenario = any; // shape of the scenario JSON
export type Requirement = any;

function currentVersionOf(scenario: Scenario) {
  return scenario.versions.find((v: any) => v.version === scenario.currentVersion);
}

// Turns one stationRequirement into a flat row for the manning list.
// activeDuring is optional; no entry means the station is manned at all times.
function parseRequirement(req: Requirement) {
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