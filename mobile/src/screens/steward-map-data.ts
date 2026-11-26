import { LINE_GROUP_LINES } from "../../../shared/auth/line-groups";
import type { MapNetwork } from "../../../shared/network/network";
import type { SnapshotScenario } from "../../../shared/offline/scenario-snapshot";
import type { CoveredSegment } from "../../../shared/scenario/affected-stations";
import {
  CLOSED_LINE,
  routeColor,
  scenarioLines,
} from "../../../shared/scenario/map-lines";
import { colors as themeColors } from "../../../shared/Theme";

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
