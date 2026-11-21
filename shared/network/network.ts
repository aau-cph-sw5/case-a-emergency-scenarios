import type { Network } from "../types/v1/network.js";

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isNetwork(value: unknown): value is Network {
  if (
    !object(value) ||
    !Array.isArray(value.stations) ||
    !Array.isArray(value.segments) ||
    !Array.isArray(value.normalPatterns)
  )
    return false;
  return (
    value.stations.every(
      (station: unknown) =>
        object(station) &&
        typeof station.code === "string" &&
        typeof station.name === "string" &&
        (station.x === null ||
          (typeof station.x === "number" && Number.isFinite(station.x))) &&
        (station.y === null ||
          (typeof station.y === "number" && Number.isFinite(station.y))),
    ) &&
    value.segments.every(
      (segment: unknown) =>
        object(segment) &&
        Number.isInteger(segment.id) &&
        (segment.trackNumber === 1 || segment.trackNumber === 2) &&
        typeof segment.stationA === "string" &&
        typeof segment.stationB === "string",
    ) &&
    value.normalPatterns.every(
      (pattern: unknown) =>
        object(pattern) &&
        typeof pattern.line === "string" &&
        ["M1", "M2", "M3", "M4"].includes(pattern.line) &&
        typeof pattern.routeCode === "string" &&
        (pattern.operationType === "PENDULUM" ||
          pattern.operationType === "ROUNDTRIP") &&
        Number.isInteger(pattern.maximumTrains) &&
        typeof pattern.maximumTrains === "number" &&
        pattern.maximumTrains >= 0 &&
        typeof pattern.did === "string" &&
        (pattern.color === undefined ||
          (typeof pattern.color === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(pattern.color))) &&
        (pattern.trackNumber === 1 ||
          pattern.trackNumber === 2 ||
          pattern.trackNumber === 12) &&
        Array.isArray(pattern.stops) &&
        pattern.stops.every((stop: unknown) => typeof stop === "string"),
    )
  );
}

type Pair = [string, string];
export const connectionKey = (a: string, b: string) =>
  JSON.stringify(a < b ? [a, b] : [b, a]);
export type MapNetwork = {
  stationNames?: Record<string, string>;
  positions: Record<string, [number, number]>;
  lines: {
    name: string;
    color?: string;
    tracks: number[];
    connections: Pair[];
    connectionTracks?: Record<string, number[]>;
  }[];
  segments: Network["segments"];
  incomplete: boolean;
  ringStations: string[];
};

export function buildMapNetwork(network: Network): MapNetwork {
  const positions: Record<string, [number, number]> = Object.create(null);
  const stationNames: Record<string, string> = Object.create(null);
  for (const station of network.stations) {
    stationNames[station.code] = station.name;
    if (station.x !== null && station.y !== null)
      positions[station.code] = [station.x, station.y];
  }
  const lines = new Map<
    string,
    {
      name: string;
      color?: string;
      tracks: number[];
      connections: Pair[];
      connectionTracks: Record<string, number[]>;
    }
  >();
  let incomplete = false;
  for (const pattern of network.normalPatterns) {
    let line = lines.get(pattern.line);
    if (!line) {
      line = {
        name: pattern.line,
        color: pattern.color,
        tracks: [],
        connections: [],
        connectionTracks: Object.create(null),
      };
      lines.set(pattern.line, line);
    }
    if (pattern.stops.length < 2) incomplete = true;
    const permitted =
      pattern.trackNumber === 12 ? [1, 2] : [pattern.trackNumber];
    for (const track of permitted)
      if (!line.tracks.includes(track)) line.tracks.push(track);
    for (let i = 1; i < pattern.stops.length; i++) {
      const a = pattern.stops[i - 1];
      const b = pattern.stops[i];
      const exists = network.segments.some(
        (segment) =>
          permitted.includes(segment.trackNumber) &&
          ((segment.stationA === a && segment.stationB === b) ||
            (segment.stationA === b && segment.stationB === a)),
      );
      if (!exists || !positions[a] || !positions[b]) {
        incomplete = true;
        continue;
      }
      if (
        permitted.some(
          (track) =>
            !network.segments.some(
              (segment) =>
                segment.trackNumber === track &&
                ((segment.stationA === a && segment.stationB === b) ||
                  (segment.stationA === b && segment.stationB === a)),
            ),
        )
      )
        incomplete = true;
      const key = connectionKey(a, b);
      const edgeTracks = line.connectionTracks[key] ?? [];
      for (const track of permitted) {
        if (
          !edgeTracks.includes(track) &&
          network.segments.some(
            (segment) =>
              segment.trackNumber === track &&
              ((segment.stationA === a && segment.stationB === b) ||
                (segment.stationA === b && segment.stationB === a)),
          )
        )
          edgeTracks.push(track);
      }
      line.connectionTracks[key] = edgeTracks;
      if (
        !line.connections.some(
          ([x, y]) => (x === a && y === b) || (x === b && y === a),
        )
      )
        line.connections.push([a, b]);
    }
  }
  if (["M1", "M2", "M3", "M4"].some((line) => !lines.has(line)))
    incomplete = true;
  return {
    stationNames,
    positions,
    lines: [...lines.values()],
    segments: network.segments,
    incomplete,
    ringStations:
      lines.get("M3")?.connections.map(([station]) => station) ?? [],
  };
}

export function edgeAllowed(
  line: MapNetwork["lines"][number],
  segments: MapNetwork["segments"] | undefined,
  tracks: number[],
  a: string,
  b: string,
): boolean {
  const lineTracks =
    line.connectionTracks?.[connectionKey(a, b)] ?? line.tracks;
  return tracks.every(
    (track) =>
      lineTracks.includes(track) &&
      (!segments ||
        segments.some(
          (segment) =>
            segment.trackNumber === track &&
            ((segment.stationA === a && segment.stationB === b) ||
              (segment.stationA === b && segment.stationB === a)),
        )),
  );
}

// Resolve stops through normal-line edges.
export function resolveStops(
  stops: string[],
  lines: MapNetwork["lines"],
  segments: MapNetwork["segments"],
  tracks: number[],
): { connections: Pair[]; incomplete: boolean } {
  const edges: Pair[] = [];
  for (const line of lines) {
    for (const [a, b] of line.connections) {
      if (!edgeAllowed(line, segments, tracks, a, b)) continue;
      if (!edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
        edges.push([a, b]);
    }
  }
  edges.sort(([a, b], [c, d]) =>
    connectionKey(a, b) < connectionKey(c, d)
      ? -1
      : connectionKey(a, b) > connectionKey(c, d)
        ? 1
        : 0,
  );
  const connections: Pair[] = [];
  for (let i = 1; i < stops.length; i++) {
    const start = stops[i - 1];
    const end = stops[i];
    if (start === end) continue;
    if (
      edges.some(
        ([a, b]) => (a === start && b === end) || (a === end && b === start),
      )
    ) {
      connections.push([start, end]);
      continue;
    }
    const findPath = (): string[] | null => {
      const queue = [start];
      const previous = new Map<string, string | null>([[start, null]]);
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const station = queue[cursor];
        if (station === end) break;
        for (const [a, b] of edges) {
          const next = a === station ? b : b === station ? a : undefined;
          if (next !== undefined && !previous.has(next)) {
            previous.set(next, station);
            queue.push(next);
          }
        }
      }
      if (!previous.has(end)) return null;
      const path: string[] = [];
      for (
        let station: string | null = end;
        station !== null;
        station = previous.get(station) ?? null
      )
        path.push(station);
      return path.reverse();
    };
    const path = findPath();
    if (!path) return { connections: [], incomplete: true };
    for (let step = 1; step < path.length; step++)
      connections.push([path[step - 1], path[step]]);
  }
  return { connections, incomplete: false };
}
