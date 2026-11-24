// No react-native or Theme imports here, so unit tests can import this file.
import { LINE_GROUP_LINES } from "../../../shared/auth/line-groups";
import type { MapNetwork } from "../../../shared/network/network";
import type { SnapshotScenario } from "../../../shared/offline/scenario-snapshot";
import {
  CLOSED_LINE,
  routeColor,
  scenarioLines,
} from "../../../shared/scenario/map-lines";

export type StewardMapPalette = {
  fallbackColor: string;
  blockedTrackColor: string;
};

export type StewardMapData = {
  lines: MapNetwork["lines"];
  colors: Record<string, string>;
  availableSegments: {
    trackNumber: number;
    stationA: string;
    stationB: string;
  }[];
  blockedTracks: NonNullable<SnapshotScenario["covers"]>;
  missingRoutes: boolean;
  missingStretch: boolean;
};

// Serializes the scenario fields that affect the steward map, so memoized map
// rendering skips unchanged refreshes while still updating on route, closure,
// line-group, or requirement changes.
export function stewardMapScenarioKey(scenario: SnapshotScenario): string {
  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );
  const requirements =
    current?.stationRequirements ??
    scenario.versions[0]?.stationRequirements ??
    [];
  return JSON.stringify({
    scenarioId: scenario.scenarioId,
    currentVersion: scenario.currentVersion,
    lineGroup: scenario.lineGroup,
    covers: scenario.covers ?? [],
    patterns: current?.operatingPlan.patterns ?? [],
    required: requirements.map(({ station, minimumStaffing }) => [
      station,
      minimumStaffing,
    ]),
  });
}

// Derives the steward map's scoped running routes, per-track closures, Metro
// line colours, available segments, and warning flags.
export function deriveStewardMap(
  scenario: SnapshotScenario,
  network: MapNetwork,
  palette: StewardMapPalette,
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
  const colors: Record<string, string> = {
    ...Object.fromEntries(
      runningLines.map((route) => [
        route.name,
        routeColor(route, groupNetwork, palette.fallbackColor),
      ]),
    ),
    [CLOSED_LINE]: palette.blockedTrackColor,
  };
  // The scenario's affected tracks may reference a station an older saved
  // network does not know.
  const missingStretch = covers.some(
    (segment) =>
      !network.positions[segment.stationA] ||
      !network.positions[segment.stationB],
  );
  return {
    lines,
    colors,
    // The scenario carries its own affected tracks, even if an offline map is
    // older.
    availableSegments: [...network.segments, ...covers],
    blockedTracks: covers,
    missingRoutes,
    missingStretch,
  };
}
