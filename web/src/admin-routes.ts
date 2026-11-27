import { getCrossovers } from "../../shared/network/crossovers";
import { selectTurnbacks } from "../../shared/network/turnbacks";
import { connectionKey, type MapNetwork } from "../../shared/network/network";

export type LineGroup = "M1/M2" | "M3/M4";
export function groupCrossovers(group: LineGroup) {
  return getCrossovers().filter((crossover) => crossover.lineGroup === group);
}

export function roundtripTurnbacks(
  group: LineGroup,
  path: readonly string[],
  lines: MapNetwork["lines"],
  segments?: MapNetwork["segments"],
) {
  const selected = selectTurnbacks(
    group,
    path,
    groupLines(group, lines),
    segments,
  );
  return { start: Boolean(selected.start), end: Boolean(selected.end) };
}

export type Route = {
  id: number;
  from: string;
  to: string;
  type: "PENDULUM" | "ROUNDTRIP";
  track: 1 | 2 | 12;
  did: string;
  color: string;
  maximumTrains: number;
  stations: string[];
  stops?: string[];
  displayIncomplete?: boolean;
};

export function groupLines(group: LineGroup, lines: MapNetwork["lines"]) {
  return lines.filter((line) => group.split("/").includes(line.name));
}

export function groupStations(group: LineGroup, lines: MapNetwork["lines"]) {
  return [
    ...new Set(
      groupLines(group, lines).flatMap((line) => line.connections.flat()),
    ),
  ].sort((a, b) => a.localeCompare(b, "da"));
}

export function coverageCandidates(
  group: LineGroup,
  lines: MapNetwork["lines"],
  segments: MapNetwork["segments"],
  routes: Route[],
) {
  const edges = new Set(
    groupLines(group, lines).flatMap((line) =>
      line.connections.map(([a, b]) => connectionKey(a, b)),
    ),
  );
  const used = new Set<string>();
  for (const route of routes) {
    const tracks = route.track === 12 ? [1, 2] : [route.track];
    for (let index = 1; index < route.stations.length; index++) {
      const key = connectionKey(
        route.stations[index - 1],
        route.stations[index],
      );
      for (const track of tracks) used.add(`${track}:${key}`);
    }
    if (route.type === "ROUNDTRIP") {
      const turns = selectTurnbacks(
        group,
        route.stations,
        groupLines(group, lines),
        segments,
      );
      for (const turn of [turns.start, turns.end]) {
        if (!turn?.extension) continue;
        const key = connectionKey(...turn.extension);
        for (const track of [1, 2]) used.add(`${track}:${key}`);
      }
    }
  }
  return segments
    .filter((segment) =>
      edges.has(connectionKey(segment.stationA, segment.stationB)),
    )
    .map((segment) => ({
      ...segment,
      used: used.has(
        `${segment.trackNumber}:${connectionKey(segment.stationA, segment.stationB)}`,
      ),
    }));
}
