import { colors as theme, DIDLineColors, palette } from "../../../shared/Theme";
import {
  LINE_GROUP_LABELS,
  LINE_GROUP_LINES,
  LINE_GROUPS,
} from "../../../shared/auth/line-groups";
import {
  CLOSED_LINE,
  closedStretchLine,
  scenarioLines,
} from "../../../shared/scenario/map-lines";
import type { Scenario } from "../../../shared/types/v1/scenario";
import type { MapNetwork } from "../../../shared/network/network";
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

// What a scenario's routes are coloured by: the Metro line each runs on, or
// one colour per destination ID, which tells two routes on one line apart.
export type ColourBy = "line" | "did";

export { closedStretchLine };

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
  const groupLineNames = LINE_GROUPS.filter(
    (group) => LINE_GROUP_LABELS[group] === lineGroup,
  ).flatMap((group) => LINE_GROUP_LINES[group]);
  const groupNetwork = network.lines.filter((line) =>
    groupLineNames.includes(line.name),
  );
  const scenarioOnly = scenarioId !== null && scenario !== null;
  const result = scenarioOnly
    ? scenarioLines(scenario, groupNetwork, network.segments)
    : {
        lines: scenarioId === null ? groupNetwork : [],
        closedLine: null,
        missingRoutes: false,
      };
  const running = result.lines;
  const closedLine = result.closedLine;
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
