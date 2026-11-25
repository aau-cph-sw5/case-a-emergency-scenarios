import { screen, within } from "@testing-library/react-native";
import Svg, { Circle } from "react-native-svg";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { buildMapNetwork } from "../../shared/network/network";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import { palette } from "../../shared/Theme";
import type { Network } from "../../shared/types/v1/network";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

// Four-line test network with distinct M1/M2 and M3/M4 branches and Metro
// brand colours so line-group scoping and per-track closures are observable.
export const metroNetworkFixture: Network = {
  stations: [
    { code: "FOR", name: "Forum", x: 100, y: 200 },
    { code: "KGN", name: "Kongens Nytorv", x: 200, y: 200 },
    { code: "ISB", name: "Islands Brygge", x: 300, y: 200 },
    { code: "KHC", name: "Christianshavn", x: 300, y: 300 },
    { code: "KBH", name: "København H", x: 100, y: 400 },
    { code: "RAD", name: "Rådhuspladsen", x: 200, y: 400 },
    { code: "GLS", name: "Gammel Strand", x: 300, y: 400 },
    { code: "ORI", name: "Orientkaj", x: 300, y: 500 },
  ],
  segments: [
    { id: 1, trackNumber: 1, stationA: "FOR", stationB: "KGN" },
    { id: 2, trackNumber: 2, stationA: "FOR", stationB: "KGN" },
    { id: 3, trackNumber: 1, stationA: "KGN", stationB: "ISB" },
    { id: 4, trackNumber: 2, stationA: "KGN", stationB: "ISB" },
    { id: 5, trackNumber: 1, stationA: "KGN", stationB: "KHC" },
    { id: 6, trackNumber: 2, stationA: "KGN", stationB: "KHC" },
    { id: 7, trackNumber: 1, stationA: "KBH", stationB: "RAD" },
    { id: 8, trackNumber: 2, stationA: "KBH", stationB: "RAD" },
    { id: 9, trackNumber: 1, stationA: "RAD", stationB: "GLS" },
    { id: 10, trackNumber: 2, stationA: "RAD", stationB: "GLS" },
    { id: 11, trackNumber: 1, stationA: "RAD", stationB: "ORI" },
    { id: 12, trackNumber: 2, stationA: "RAD", stationB: "ORI" },
  ],
  normalPatterns: [
    {
      line: "M1",
      routeCode: "M1-NORM",
      operationType: "ROUNDTRIP",
      trackNumber: 12,
      maximumTrains: 6,
      did: "M1",
      color: palette.metroLineOne,
      stops: ["FOR", "KGN", "ISB"],
    },
    {
      line: "M2",
      routeCode: "M2-NORM",
      operationType: "ROUNDTRIP",
      trackNumber: 12,
      maximumTrains: 6,
      did: "M2",
      color: palette.metroLineTwo,
      stops: ["FOR", "KGN", "KHC"],
    },
    {
      line: "M3",
      routeCode: "M3-NORM",
      operationType: "ROUNDTRIP",
      trackNumber: 12,
      maximumTrains: 6,
      did: "M3",
      color: palette.metroLineThree,
      stops: ["KBH", "RAD", "GLS"],
    },
    {
      line: "M4",
      routeCode: "M4-NORM",
      operationType: "ROUNDTRIP",
      trackNumber: 12,
      maximumTrains: 6,
      did: "M4",
      color: palette.metroLineFour,
      stops: ["KBH", "RAD", "ORI"],
    },
  ],
};

export const metroMapNetwork = buildMapNetwork(metroNetworkFixture);

export function makeRouteScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    ...(scenario as Scenario),
    scenarioId: "MET-A-031-TEST",
    name: "Single-track M1 closure",
    lineGroup: "M1_M2",
    currentVersion: "1",
    covers: [{ trackNumber: 2, stationA: "KGN", stationB: "ISB" }],
    versions: [
      {
        version: "1",
        revision: "Initial",
        operatingPlan: {
          name: "Single-track plan",
          patterns: [
            {
              operationType: "PENDULUM",
              routeCode: "FOR-ISB",
              trackNumber: 1,
              maximumTrains: 2,
              did: "11",
              description: "M1 single-track pendulum",
              route: [
                { sequence: 1, station: "FOR" },
                { sequence: 2, station: "KGN" },
                { sequence: 3, station: "ISB" },
              ],
            },
            {
              operationType: "ROUNDTRIP",
              routeCode: "FOR-KHC",
              trackNumber: 12,
              maximumTrains: 4,
              did: "22",
              description: "M2 normal service",
              route: [
                { sequence: 1, station: "FOR" },
                { sequence: 2, station: "KGN" },
                { sequence: 3, station: "KHC" },
              ],
            },
          ],
        },
        stationRequirements: [
          {
            station: "KGN",
            placement: "Platform 1",
            minimumStaffing: 2,
            actions: [{ sequence: 1, instruction: "Guide passengers" }],
          },
          {
            station: "ISB",
            placement: "Platform 2",
            minimumStaffing: 1,
            actions: [{ sequence: 1, instruction: "Close track 2" }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function makeRouteSnapshot(
  routeScenario: Scenario,
  deployments: ScenarioState["deployments"] = [],
) {
  return buildSnapshot(
    {
      active: true,
      state: {
        ...(activeState as ScenarioState),
        scenarioId: routeScenario.scenarioId,
        deployments,
      },
      scenario: routeScenario,
    },
    "9",
    new Date("2026-11-24T09:00:00Z"),
  );
}

export function circleByTestId(testID: string) {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .find((node) => node.props.testID === testID);
}

export function parseViewBox(viewBox: string | undefined) {
  if (viewBox === undefined) {
    throw new Error("Expected SVG viewBox to be defined");
  }
  const [x, y, width, height] = viewBox.split(" ").map(Number);
  return { x, y, width, height };
}

export function containsPoint(
  box: { x: number; y: number; width: number; height: number },
  [px, py]: [number, number],
) {
  return (
    px > box.x &&
    px < box.x + box.width &&
    py > box.y &&
    py < box.y + box.height
  );
}

export function overlaySvgViewBox(): string | undefined {
  return within(screen.getByTestId("overlay-map-container")).UNSAFE_getByType(
    Svg,
  ).props.viewBox;
}
