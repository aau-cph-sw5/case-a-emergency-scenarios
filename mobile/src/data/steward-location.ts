import { orderByProximity, type StopPosition } from "./station-proximity";

// STUB: the server has no endpoint yet for a steward's last position or for
// the stations ordered by proximity. Everything below stands in for it and
// is replaced by real calls in the sub-issue that connects the app to the
// endpoints. The screen only uses loadLocationOptions and rememberPosition,
// so swapping the stub does not touch the view.

// Mirrors fixtures/v1/metro-lines/M1.json and M2.json.
const STUB_STOPS: Record<string, StopPosition> = {
  "Station A": { line: "M1", sequence: 1 },
  "Station B": { line: "M1", sequence: 2 },
  "Station C": { line: "M1", sequence: 3 },
  "Station F": { line: "M2", sequence: 1 },
  "Station G": { line: "M2", sequence: 2 },
  "Station H": { line: "M2", sequence: 3 },
};

// The steward's last reported position, kept in memory only.
let stubLastPosition: string | null = null;

export type LocationOptions = {
  // The steward's last reported position, or null if none yet.
  lastPosition: string | null;
  // The active scenario's stations, nearest to lastPosition first.
  stations: string[];
};

// Returns the stations the steward can choose from and the current position.
export async function loadLocationOptions(
  scenarioStations: string[],
): Promise<LocationOptions> {
  return {
    lastPosition: stubLastPosition,
    stations: orderByProximity(scenarioStations, stubLastPosition, STUB_STOPS),
  };
}

// STUB ONLY: the server stores the report itself, so this goes away together
// with the stub.
export function rememberPosition(station: string): void {
  stubLastPosition = station;
}

// Test helper: clears the in-memory position.
export function resetStubPosition(): void {
  stubLastPosition = null;
}
