import M1 from "../../fixtures/v1/metro-lines/M1.json";
import M2 from "../../fixtures/v1/metro-lines/M2.json";

import type { TrackSegment } from "../../shared/types/v1/scenario-list";

// The lines are the fixtures', like stationView uses them.
// ponytail: fetch GET /api/v1/metro-lines/{id} when there are more lines.
const LINES = [M1, M2];

function stationLabel(station: string): string {
  const names = LINES.filter((line) =>
    line.stops.some((stop) => stop.station === station),
  ).map((line) => line.name);
  return names.length === 0 ? station : `${station} ${names.join("/")}`;
}

// "Station A M1 – Station B M1" for each segment the scenario covers.
export function describeCovers(covers: TrackSegment[] = []): string[] {
  return covers.map(
    (c) => `${stationLabel(c.stationA)} – ${stationLabel(c.stationB)}`,
  );
}
