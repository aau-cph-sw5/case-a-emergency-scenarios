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
