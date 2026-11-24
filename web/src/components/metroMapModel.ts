import { colors as theme, DIDLineColors, palette } from "../../../shared/Theme";
import { routeConnections } from "../../../shared/scenario/route-connections";
import type { Scenario } from "../../../shared/types/v1/scenario";
import {
  connectionKey,
  resolveStops,
  type MapNetwork,
} from "../../../shared/network/network";
import {
  IDLE_LINE,
  OPEN_LINE,
  idleStretchLines,
  linesFitting,
  routeColor,
} from "./metroMapLines";

// Pure data for the map: which lines are drawn, in what colour, and what the
// legend says. No React here, so MetroMap.tsx only lays the result out.

type Lines = MapNetwork["lines"];
type Pattern = NonNullable<
  Scenario["versions"][number]["operatingPlan"]
>["patterns"][number];

const CLOSED_LINE = "Spærret";

// What a scenario's routes are coloured by: the Metro line each runs on, or
// one colour per destination ID, which tells two routes on one line apart.
export type ColourBy = "line" | "did";

// One route of the operating plan, as a map line. A route that cannot be
// resolved is kept with no connections and flagged missing.
function patternLine(
  pattern: Pattern,
  groupLines: Lines,
  segments: MapNetwork["segments"],
) {
  const tracks = pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber];
  const base = { name: pattern.did, color: pattern.color, tracks };
  const stops = routeConnections(pattern.route);
  const stopList = stops.length
    ? [stops[0][0], ...stops.map(([, station]) => station)]
    : [];
  if (stopList.length < 2 || stops.length !== pattern.route.length - 1)
    return { line: { ...base, connections: [] }, missing: true };
  const result = resolveStops(stopList, groupLines, segments, tracks);
  return {
    line: { ...base, connections: result.connections },
    missing: Boolean(result.incomplete),
  };
}

function scenarioLines(
  scenario: Scenario,
  groupLines: Lines,
  segments: MapNetwork["segments"],
) {
  const expectedLines =
    scenario.lineGroup === "M1_M2" ? ["M1", "M2"] : ["M3", "M4"];
  if (!groupLines.some((line) => expectedLines.includes(line.name))) {
    return { lines: [], missingRoutes: false };
  }

  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );
  const built =
    current?.operatingPlan.patterns
      .filter((pattern) => pattern.did.trim() !== "")
      .sort((a, b) => a.did.localeCompare(b.did, undefined, { numeric: true }))
      .map((pattern) => patternLine(pattern, groupLines, segments)) ?? [];
  return {
    lines: built.map(({ line }) => line),
    missingRoutes: built.some(({ missing }) => missing) || built.length === 0,
  };
}

// The covered segments that no running route already draws, as one line.
export function closedStretchLine(
  covers: Scenario["covers"],
  running: Lines,
): Lines[number] | null {
  const drawn = (a: string, b: string) =>
    running.some((line) =>
      line.connections.some(
        ([x, y]) => (x === a && y === b) || (x === b && y === a),
      ),
    );
  const open = (covers ?? []).filter(
    (cover) => !drawn(cover.stationA, cover.stationB),
  );
  if (open.length === 0) return null;
  const connectionTracks: Record<string, number[]> = {};
  const connections: [string, string][] = [];
  for (const { stationA, stationB, trackNumber } of open) {
    const key = connectionKey(stationA, stationB);
    if (!connectionTracks[key]) {
      connectionTracks[key] = [];
      connections.push([stationA, stationB]);
    }
    if (!connectionTracks[key].includes(trackNumber))
      connectionTracks[key].push(trackNumber);
  }
  return {
    name: CLOSED_LINE,
    tracks: [...new Set(open.map((cover) => cover.trackNumber))],
    connections,
    connectionTracks,
  };
}

// The stretch the scenario closes. The operating plan only holds the routes
// that still run, so it is on no route and would not be drawn at all, leaving
// its staffed stations floating. It is drawn as its own line, dashed by
// blockedTracks.
function closedLineFor(
  scenario: Scenario | null,
  lineGroup: string,
  running: Lines,
) {
  if (scenario === null || scenario.lineGroup.replace("_", "/") !== lineGroup)
    return null;
  return closedStretchLine(scenario.covers, running);
}

// Stations only the faded line reaches: out of service, but still on the map.
function mutedStationsOf(idle: Lines, drawn: Lines) {
  const drawnStations = new Set(drawn.flatMap((l) => l.connections.flat()));
  return idle
    .filter((line) => line.name === IDLE_LINE)
    .flatMap((line) => line.connections.flat())
    .filter((station) => !drawnStations.has(station));
}

// The lines the map draws for the chosen scenario and line group.
export function buildMapLines(
  scenarioId: string | null,
  scenario: Scenario | null,
  lineGroup: string,
  network: MapNetwork,
) {
  const groupNetwork = network.lines.filter((line) =>
    lineGroup.split("/").includes(line.name),
  );
  const scenarioOnly = scenarioId !== null && scenario !== null;
  const result = scenarioOnly
    ? scenarioLines(scenario, groupNetwork, network.segments)
    : { lines: scenarioId === null ? groupNetwork : [], missingRoutes: false };
  const running = result.lines;
  const closedLine = scenarioOnly
    ? closedLineFor(scenario, lineGroup, running)
    : null;
  const drawn = closedLine ? [...running, closedLine] : running;
  // Everything in the group that no running route draws is kept, faded, so a
  // station that is out of service is still on the map.
  const idle = scenarioOnly
    ? idleStretchLines(groupNetwork, drawn, closedLine)
    : [];
  return {
    groupNetwork,
    running,
    drawn,
    groupLines: [...idle, ...drawn],
    mutedStations: mutedStationsOf(idle, drawn),
    missingRoutes: result.missingRoutes,
  };
}

export function routeColorMap(
  scenarioId: string | null,
  groupNetwork: Lines,
  running: Lines,
  colourBy: ColourBy,
) {
  const lineColor = (line: Lines[number]) => line.color ?? palette.networkGrey;
  if (scenarioId === null)
    return Object.fromEntries(
      groupNetwork.map((line) => [line.name, lineColor(line)]),
    );
  return {
    ...Object.fromEntries(
      running.map((route, index) => [
        route.name,
        colourBy === "did"
          ? (route.color ?? DIDLineColors[index % DIDLineColors.length])
          : routeColor(route, groupNetwork),
      ]),
    ),
    [CLOSED_LINE]: theme.blockedTrack,
    [IDLE_LINE]: palette.networkGrey,
    ...Object.fromEntries(
      groupNetwork.map((line) => [
        `${OPEN_LINE}-${line.name}`,
        lineColor(line),
      ]),
    ),
  };
}

// The legend explains the colours: one entry per Metro line (a route on a
// shared stretch is "M1 / M2", in Metro Black) or one per destination ID.
export function legendEntriesFor(
  running: Lines,
  groupNetwork: Lines,
  colors: Record<string, string>,
  colourBy: ColourBy,
) {
  const labelOf = (route: Lines[number]) =>
    colourBy === "did"
      ? route.name
      : linesFitting(route, groupNetwork)
          .map((line) => line.name)
          .join(" / ") || route.name;
  const entries = [
    ...new Map(
      running.map((route) => {
        const label = labelOf(route);
        return [label, { label, color: colors[route.name] }] as const;
      }),
    ).values(),
  ];
  if (colourBy === "line")
    entries.sort((a, b) =>
      a.label.localeCompare(b.label, "da", { numeric: true }),
    );
  return entries;
}
