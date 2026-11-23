// No react-native or Theme imports here, so tests/unit can import this file in Node.
import { LINE_GROUP_LABELS, type LineGroup } from "../auth/line-groups";
import {
  connectionKey,
  resolveStops,
  type MapNetwork,
} from "../network/network";
import {
  affectedStretchAsMapLine,
  samePiece,
  type CoveredSegment,
} from "./affected-stations";
import { routeConnections } from "./route-connections";

export const CLOSED_LINE = "Spærret";

export type MapRouteStop = {
  sequence?: unknown;
  station?: unknown;
};

export type MapOperatingPattern = {
  did: string;
  trackNumber: number;
  color?: string;
  route: readonly MapRouteStop[];
};

export type MapScenario = {
  lineGroup: LineGroup;
  currentVersion: string;
  covers?: readonly CoveredSegment[];
  versions: readonly {
    version: string;
    operatingPlan?: {
      patterns: readonly MapOperatingPattern[];
    };
  }[];
};

type MapLine = MapNetwork["lines"][number];

export type ScenarioLinesResult = {
  lines: MapNetwork["lines"];
  closedLine: MapLine | null;
  missingRoutes: boolean;
};

// A route takes the colour of the single Metro line that contains all of its
// connections. Empty routes, routes shared by multiple lines, or routes that
// match no line use fallbackColor.
export function routeColor(
  route: Pick<MapLine, "connections">,
  lines: readonly Pick<MapLine, "connections" | "color">[],
  fallbackColor: string,
): string {
  if (route.connections.length === 0) return fallbackColor;
  const fits = lines.filter((line) =>
    route.connections.every((connection) =>
      line.connections.some((other) => samePiece(connection, other)),
    ),
  );
  return fits.length === 1 && fits[0].color ? fits[0].color : fallbackColor;
}

// Covered segments that no running route already draws on the same track,
// built as one map line with per-track metadata.
export function closedStretchLine(
  covers: readonly CoveredSegment[] | undefined,
  running: readonly Pick<
    MapLine,
    "tracks" | "connections" | "connectionTracks"
  >[],
): MapLine | null {
  const drawn = (stationA: string, stationB: string, trackNumber: number) => {
    const key = connectionKey(stationA, stationB);
    return running.some(
      (line) =>
        (line.connectionTracks?.[key] ?? line.tracks).includes(trackNumber) &&
        line.connections.some((piece) =>
          samePiece(piece, [stationA, stationB]),
        ),
    );
  };
  const open = (covers ?? []).filter(
    (cover) => !drawn(cover.stationA, cover.stationB, cover.trackNumber),
  );
  if (open.length === 0) return null;
  return affectedStretchAsMapLine({ name: CLOSED_LINE, covers: open }, null);
}

// Resolves the scenario's current operating patterns and remaining closed
// stretch for the selected line group.
export function scenarioLines(
  scenario: MapScenario,
  groupLines: MapNetwork["lines"],
  segments: MapNetwork["segments"],
): ScenarioLinesResult {
  const expectedLines = LINE_GROUP_LABELS[scenario.lineGroup].split("/");
  if (!groupLines.some((line) => expectedLines.includes(line.name))) {
    return { lines: [], closedLine: null, missingRoutes: false };
  }

  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );

  let missingRoutes = false;
  const routes: MapNetwork["lines"] =
    current?.operatingPlan?.patterns
      .filter((pattern) => pattern.did.trim() !== "")
      .sort((a, b) => a.did.localeCompare(b.did, undefined, { numeric: true }))
      .map((pattern) => {
        const tracks =
          pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber];
        const stops = routeConnections(pattern.route);
        const stopList = stops.length
          ? [stops[0][0], ...stops.map(([, station]) => station)]
          : [];
        if (stopList.length < 2 || stops.length !== pattern.route.length - 1) {
          missingRoutes = true;
          return {
            name: pattern.did,
            color: pattern.color,
            tracks,
            connections: [],
          };
        }
        const result = resolveStops(stopList, groupLines, segments, tracks);
        if (result.incomplete) missingRoutes = true;
        return {
          name: pattern.did,
          color: pattern.color,
          tracks,
          connections: result.connections,
        };
      }) ?? [];

  return {
    lines: routes,
    closedLine: closedStretchLine(scenario.covers, routes),
    missingRoutes: missingRoutes || routes.length === 0,
  };
}
