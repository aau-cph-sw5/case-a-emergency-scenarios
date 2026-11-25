import { getCrossovers, type Crossover } from "../../mockData/data";
import { connectionKey, type MapNetwork } from "../../shared/network/network";

export type LineGroup = "M1/M2" | "M3/M4";
export function groupCrossovers(group: LineGroup) {
  return getCrossovers().filter((crossover) => crossover.lineGroup === group);
}

export function crossoverOnSegment(
  group: LineGroup,
  a: string,
  b: string,
): Crossover | undefined {
  return groupCrossovers(group).find(
    ({ between }) => between.includes(a) && between.includes(b),
  );
}

export function roundtripTurnbacks(group: LineGroup, path: readonly string[]) {
  if (path.length < 2) return { start: false, end: false };
  return {
    start: crossoverOnSegment(group, path[0], path[1]) !== undefined,
    end:
      crossoverOnSegment(
        group,
        path[path.length - 2],
        path[path.length - 1],
      ) !== undefined,
  };
}

export function usesCrossover(
  path: readonly string[],
  crossover: Pick<Crossover, "between">,
) {
  if (path.length < 2 || (path.length > 2 && path[0] === path[path.length - 1]))
    return false;
  const [a, b] = crossover.between;
  const matches = (first: string, second: string) =>
    (first === a && second === b) || (first === b && second === a);
  return (
    matches(path[0], path[1]) ||
    matches(path[path.length - 2], path[path.length - 1])
  );
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
