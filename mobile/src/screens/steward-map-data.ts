import { LINE_GROUP_LINES } from "../../../shared/auth/line-groups";
import { stationCoverage } from "../../../shared/components/stationState";
import type { MapNetwork } from "../../../shared/network/network";
import type {
  ScenarioSnapshot,
  SnapshotScenario,
} from "../../../shared/offline/scenario-snapshot";
import {
  affectedStations,
  type CoveredSegment,
} from "../../../shared/scenario/affected-stations";
import {
  CLOSED_LINE,
  routeColor,
  scenarioLines,
} from "../../../shared/scenario/map-lines";
import { colors as themeColors } from "../../../shared/Theme";
import { findOwnAssignment } from "./own-assignment";

export type StationRequirement = NonNullable<
  ScenarioSnapshot["scenario"]["versions"][number]["stationRequirements"]
>[number];

// One row per station (#376). A scenario can have several requirement rows
// for the same station (one per placement), and a station must never be
// listed twice. The rows are merged in the order the station first appears,
// and the station needs the stewards of all its rows together: a station
// that needs 1 on the platform and 1 at the entrance needs 2.
export function oneRowPerStation(
  rows: readonly StationRequirement[],
): StationRequirement[] {
  const merged = new Map<string, StationRequirement>();
  for (const row of rows) {
    const seen = merged.get(row.station);
    merged.set(
      row.station,
      seen
        ? {
            ...seen,
            minimumStaffing: seen.minimumStaffing + row.minimumStaffing,
          }
        : row,
    );
  }
  return [...merged.values()];
}

// The steward's own station and the one they checked out from (#310). The
// own assignment stands out without interaction (MET-A-010 criterion 2);
// userId comes from the offline copy, so this works offline. The station the
// app just assigned comes first, since the server does not record it in the
// deployments yet (#263). A checked-out deployment keeps the steward as staff,
// so the control room sees who was there (#289); it is not the steward's own
// station any more, and after checking out an older copy may still show them
// there, so the app's own status decides (#310).
export function ownStations(
  snapshot: ScenarioSnapshot,
  assignedStation: string | undefined,
  checkedOutStation: string | undefined,
) {
  const ownAssignment = findOwnAssignment(
    snapshot.state.deployments,
    snapshot.userId,
  );
  const leftStation =
    checkedOutStation ??
    (ownAssignment?.status === "CHECKED_OUT"
      ? ownAssignment.fulfills
      : undefined);
  const ownStation =
    assignedStation ??
    (checkedOutStation === undefined && ownAssignment?.status !== "CHECKED_OUT"
      ? ownAssignment?.fulfills
      : undefined);
  return { ownStation, leftStation };
}

export type StewardMapData = Pick<MapNetwork, "positions" | "ringStations"> & {
  lines: MapNetwork["lines"];
  colors: Record<string, string>;
  availableSegments: CoveredSegment[];
  blockedTracks: CoveredSegment[];
  // Every station on the line group's network lines and the scenario's
  // routes, for a view of the whole line group.
  groupStations: string[];
  missingRoutes: boolean;
  missingStretch: boolean;
};

export type StewardMapModel = {
  mapData: StewardMapData;
  stations: string[];
  required: StationRequirement[];
  levels: ReturnType<typeof stationCoverage>;
  ownStation: string | undefined;
  mapKey: string;
  levelsKey: string;
};

// Shared derived inputs for both the 21:9 preview and the full-line overlay.
export function deriveStewardMapModel(
  snapshot: ScenarioSnapshot,
  network: MapNetwork,
  assignedStation?: string,
  checkedOutStation?: string,
): StewardMapModel {
  const { scenario, state } = snapshot;
  const required = oneRowPerStation(
    scenario.versions[0]?.stationRequirements ?? [],
  );
  const { ownStation } = ownStations(
    snapshot,
    assignedStation,
    checkedOutStation,
  );
  const levels = stationCoverage(required, state);
  const mapData = deriveStewardMap(scenario, network);
  const stations = affectedStations(scenario);
  return {
    mapData,
    stations,
    required,
    levels,
    ownStation,
    mapKey: JSON.stringify({ mapData, required, stations }),
    levelsKey: JSON.stringify(levels),
  };
}

// The steward map's running routes and closed tracks, scoped to the
// scenario's line group.
export function deriveStewardMap(
  scenario: SnapshotScenario,
  network: MapNetwork,
): StewardMapData {
  const expectedLines = LINE_GROUP_LINES[scenario.lineGroup];
  const groupNetwork = network.lines.filter((line) =>
    expectedLines.includes(line.name),
  );
  const {
    lines: runningLines,
    closedLine,
    missingRoutes,
  } = scenarioLines(scenario, groupNetwork, network.segments);
  const covers = scenario.covers ?? [];
  const lines = closedLine ? [...runningLines, closedLine] : runningLines;
  const colors = {
    ...Object.fromEntries(
      runningLines.map((route) => [
        route.name,
        routeColor(route, groupNetwork, themeColors.text),
      ]),
    ),
    [CLOSED_LINE]: themeColors.blockedTrack,
  };
  const groupStations = [
    ...new Set(
      [...groupNetwork, ...lines].flatMap((line) => line.connections.flat()),
    ),
  ];
  // An older saved network may lack a station of the scenario's tracks.
  const missingStretch = covers.some(
    (segment) =>
      !network.positions[segment.stationA] ||
      !network.positions[segment.stationB],
  );
  return {
    positions: network.positions,
    ringStations: network.ringStations,
    lines,
    colors,
    // The scenario carries its own affected tracks, even if an offline map is
    // older.
    availableSegments: [...network.segments, ...covers],
    blockedTracks: covers,
    groupStations,
    missingRoutes,
    missingStretch,
  };
}
