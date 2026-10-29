import type { ScenarioDefinition } from "../../../shared/scenario/active-scenario";
import { getStation } from "../../../mockData/data";

//helper function as map draws "lines" made of station pairs
//turns the affected stations (covers) into the maps "lines"
//filter keeps only pairs where both stations have a position
export function affectedStretchAsMapLine(scenario: ScenarioDefinition) {
  return {
    name: scenario.name,
    tracks: [1, 2],
    connections: (scenario.covers ?? [])
      .map(
        (segment) => [segment.stationA, segment.stationB] as [string, string],
      )
      .filter(
        ([stationA, stationB]) => getStation(stationA) && getStation(stationB),
      ),
  };
}

const MAP_MARGIN = 60;

//helper function to name stations in order.
//covers is the affected stations and the stations in the middle appear twice
export function affectedStations(scenario: ScenarioDefinition) {
  return [
    ...new Set(
      (scenario.covers ?? []).flatMap((segment) => [
        segment.stationA,
        segment.stationB,
      ]),
    ),
  ];
}

export function areaAroundStations(stations: string[]) {
  //positions from the stations from the map
  const positions = stations
    .map((station) => getStation(station))
    .filter((position) => position !== undefined);

  //none stations on view? then shows the whole canvas
  if (positions.length === 0) return undefined;
  //takes the outermost stations in each direction
  const xs = positions.map((position) => position[0]);
  const ys = positions.map((position) => position[1]);

  // we push the edge out by the margin
  const left = Math.min(...xs) - MAP_MARGIN;
  const right = Math.max(...xs) + MAP_MARGIN;
  const top = Math.min(...ys) - MAP_MARGIN;
  const bottom = Math.max(...ys) + MAP_MARGIN;

  //here return the values in text so it becomes "(the numbers)"
  return `${left} ${top} ${right - left} ${bottom - top}`;
}

type StationPair = [string, string];

// FOR–KN and KN–FOR are the same piece of track.
function samePiece([a, b]: StationPair, [c, d]: StationPair) {
  return (a === c && b === d) || (a === d && b === c);
}

// Luna's network without the pieces that are in the affected stretch,
// so those pieces belong only to the stretch and are drawn fully in its colour.
export function networkWithoutStretch(
  networkLines: { name: string; connections: StationPair[] }[],
  stretchPieces: StationPair[],
) {
  return networkLines.map((line) => ({
    ...line,
    connections: line.connections.filter(
      (piece) =>
        !stretchPieces.some((stretchPiece) => samePiece(piece, stretchPiece)),
    ),
  }));
}
