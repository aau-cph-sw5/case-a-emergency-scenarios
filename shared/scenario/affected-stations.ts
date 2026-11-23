import { getStation } from "../../mockData/data";
import { connectionKey } from "../network/network";
import type { SnapshotScenario } from "../offline/scenario-snapshot";
import type { TrackSegment } from "../types/v1/scenario";

export type StationPair = [string, string];

export type CoveredSegment = Pick<
  TrackSegment,
  "trackNumber" | "stationA" | "stationB"
>;

// Turns covered track segments into a map line with per-track metadata,
// deduplicating station pairs by connectionKey. When position is provided,
// only pairs where both endpoints have a map position are kept.
export function affectedStretchAsMapLine(
  scenario: { name: string; covers?: readonly CoveredSegment[] },
  position:
    ((station: string) => [number, number] | undefined) | null = getStation,
) {
  const connections: StationPair[] = [];
  const connectionTracks: Record<string, number[]> = {};
  const tracks: number[] = [];

  for (const { stationA, stationB, trackNumber } of scenario.covers ?? []) {
    if (position && (!position(stationA) || !position(stationB))) continue;
    const key = connectionKey(stationA, stationB);
    if (!connectionTracks[key]) {
      connectionTracks[key] = [];
      connections.push([stationA, stationB]);
    }
    if (!connectionTracks[key].includes(trackNumber)) {
      connectionTracks[key].push(trackNumber);
    }
    if (!tracks.includes(trackNumber)) {
      tracks.push(trackNumber);
    }
  }

  return {
    name: scenario.name,
    tracks,
    connections,
    connectionTracks,
  };
}

const MAP_MARGIN = 60;

//helper function to name stations in order.
//covers is the affected stations and the stations in the middle appear twice
export function affectedStations(scenario: SnapshotScenario) {
  return [
    ...new Set(
      (scenario.covers ?? []).flatMap((segment) => [
        segment.stationA,
        segment.stationB,
      ]),
    ),
  ];
}

export function areaAroundStations(
  stations: string[],
  margin = MAP_MARGIN,
  position: (station: string) => [number, number] | undefined = getStation,
) {
  //positions from the stations from the map
  const positions = stations
    .map((station) => position(station))
    .filter((position) => position !== undefined);

  //none stations on view? then shows the whole canvas
  if (positions.length === 0) return undefined;
  //takes the outermost stations in each direction
  const xs = positions.map((position) => position[0]);
  const ys = positions.map((position) => position[1]);

  // we push the edge out by the margin
  const left = Math.min(...xs) - margin;
  const right = Math.max(...xs) + margin;
  const top = Math.min(...ys) - margin;
  const bottom = Math.max(...ys) + margin;

  //here return the values in text so it becomes "(the numbers)"
  return `${left} ${top} ${right - left} ${bottom - top}`;
}

// FOR-KN and KN-FOR are the same piece of track.
export function samePiece([a, b]: StationPair, [c, d]: StationPair) {
  return (a === c && b === d) || (a === d && b === c);
}

// Luna's network without the pieces that are in the affected stretch,
// so those pieces belong only to the stretch and are drawn fully in its colour.
export function networkWithoutStretch<
  Line extends { name: string; connections: StationPair[] },
>(networkLines: Line[], stretchPieces: StationPair[]) {
  return networkLines.map((line) => ({
    ...line,
    connections: line.connections.filter(
      (piece) =>
        !stretchPieces.some((stretchPiece) => samePiece(piece, stretchPiece)),
    ),
  }));
}

// The lines that run through at least one of the pieces. A piece shared by
// two lines, for example FOR–KGN on M1 and M2, keeps both.
export function linesThrough<Line extends { connections: StationPair[] }>(
  networkLines: Line[],
  pieces: StationPair[],
) {
  return networkLines.filter((line) =>
    line.connections.some((piece) =>
      pieces.some((other) => samePiece(piece, other)),
    ),
  );
}

// The stations the scenario's current version needs staff at, each once and
// in the scenario's order.
export function requiredStations(scenario: {
  currentVersion: string;
  versions: { version: string; stationRequirements?: { station: string }[] }[];
}) {
  const current = scenario.versions.find(
    (version) => version.version === scenario.currentVersion,
  );
  return [
    ...new Set(
      (current?.stationRequirements ?? []).map(({ station }) => station),
    ),
  ];
}
