import type { Network } from "../../shared/types/v1/network";

export const network: Network = {
  stations: [
    { code: "Station A", name: "Station A", x: 100, y: 200 },
    { code: "Station B", name: "Station B", x: 200, y: 200 },
  ],
  segments: [
    { id: 1, trackNumber: 1, stationA: "Station A", stationB: "Station B" },
    { id: 2, trackNumber: 2, stationA: "Station A", stationB: "Station B" },
  ],
  normalPatterns: (["M1", "M2", "M3", "M4"] as const).map((line) => ({
    line,
    routeCode: `TEST-${line}`,
    operationType: "ROUNDTRIP",
    trackNumber: 12,
    maximumTrains: 1,
    did: `TEST-${line}`,
    stops: ["Station A", "Station B"],
  })),
};
