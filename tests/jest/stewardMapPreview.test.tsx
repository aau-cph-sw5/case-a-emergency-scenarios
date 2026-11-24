import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Circle, Line } from "react-native-svg";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { sendPositionReport } from "../../mobile/src/api/position-report";
import { resetRememberedStatuses } from "../../mobile/src/data/steward-status";
import { queuePositionReport } from "../../mobile/src/offline/queue-position-report";
import {
  reportRejection,
  waitingReport,
} from "../../mobile/src/offline/waiting-report";
import { StewardView } from "../../mobile/src/screens/StewardView";
import { buildMapNetwork } from "../../shared/network/network";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import { useActiveScenario } from "../../shared/offline/use-active-scenario";
import { colors, coverageColors, motion, palette } from "../../shared/Theme";
import type { Network } from "../../shared/types/v1/network";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

const metroNetwork: Network = {
  stations: [
    { code: "FOR", name: "Forum", x: 100, y: 200 },
    { code: "KGN", name: "Kongens Nytorv", x: 200, y: 200 },
    { code: "ISB", name: "Islands Brygge", x: 300, y: 200 },
    { code: "KHC", name: "Christianshavn", x: 300, y: 300 },
    { code: "KBH", name: "København H", x: 100, y: 400 },
    { code: "RAD", name: "Rådhuspladsen", x: 200, y: 400 },
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
      stops: ["KBH", "RAD"],
    },
    {
      line: "M4",
      routeCode: "M4-NORM",
      operationType: "ROUNDTRIP",
      trackNumber: 12,
      maximumTrains: 6,
      did: "M4",
      color: palette.metroLineFour,
      stops: ["KBH", "RAD"],
    },
  ],
};

const mockMapNetwork = buildMapNetwork(metroNetwork);

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("../../shared/offline/use-active-scenario", () => ({
  useActiveScenario: jest.fn(),
}));
jest.mock("../../shared/socket/useSocketState", () => ({
  useSocketState: () => ({ isConnected: true, messages: [] }),
}));
jest.mock("../../mobile/src/socket", () => ({
  socket: { on: jest.fn(), off: jest.fn() },
}));
jest.mock("../../mobile/src/network/useNetwork", () => ({
  useNetwork: () => ({
    network: mockMapNetwork,
    usingCached: false,
    status: "ready",
  }),
}));
jest.mock("../../mobile/src/offline/snapshot-store", () => ({
  snapshotStore: {},
}));
jest.mock("../../mobile/src/api/position-report", () => ({
  ...jest.requireActual<object>("../../mobile/src/api/position-report"),
  sendPositionReport: jest.fn(),
}));
jest.mock("../../mobile/src/offline/waiting-report", () => ({
  waitingReport: jest.fn(async () => null),
  reportRejection: jest.fn(async () => null),
}));
jest.mock("../../mobile/src/offline/queue-position-report", () => ({
  queuePositionReport: jest.fn(),
}));
jest.mock("../../mobile/src/offline/station-message-store", () => ({
  stationMessageQueueStore: {
    discardEndedRejections: jest.fn(async () => {}),
    getPending: jest.fn(async () => []),
    getRejected: jest.fn(async () => []),
  },
  onStationMessagesChanged: () => () => undefined,
  notifyStationMessagesChanged: jest.fn(),
  stationMessageDelivery: {
    flush: jest.fn(async () => ({
      delivered: [],
      rejected: 0,
      pending: 0,
      blocked: false,
    })),
  },
}));
jest.mock("../../mobile/src/offline/position-report-delivery-instance", () => ({
  positionReportDelivery: {
    flush: jest.fn(async () => ({
      acknowledged: 0,
      rejected: 0,
      pending: 0,
      superseded: [],
    })),
  },
}));

const activeScenario = useActiveScenario as jest.MockedFunction<
  typeof useActiveScenario
>;
const report = sendPositionReport as jest.MockedFunction<
  typeof sendPositionReport
>;
const queue = jest.mocked(queuePositionReport);
const waiting = jest.mocked(waitingReport);
const rejection = jest.mocked(reportRejection);

const stewardScenario: Scenario = {
  ...(scenario as Scenario),
  scenarioId: "STEWARD-MAP-001",
  name: "KGN-ISB single track",
  lineGroup: "M1_M2",
  currentVersion: "1",
  covers: [{ trackNumber: 2, stationA: "KGN", stationB: "ISB" }],
  versions: [
    {
      version: "1",
      revision: "Initial",
      operatingPlan: {
        name: "Pendulum",
        patterns: [
          {
            operationType: "PENDULUM",
            routeCode: "FOR-ISB",
            trackNumber: 1,
            maximumTrains: 2,
            did: "11",
            description: "M1 pendulum on track 1",
            route: [
              { sequence: 1, station: "FOR" },
              { sequence: 2, station: "KGN" },
              { sequence: 3, station: "ISB" },
            ],
          },
        ],
      },
      stationRequirements: [
        {
          station: "KGN",
          placement: "Platform 1",
          minimumStaffing: 1,
          actions: [{ sequence: 1, instruction: "Assist passengers" }],
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
};

const snapshot = buildSnapshot(
  {
    active: true,
    state: {
      ...(activeState as ScenarioState),
      scenarioId: stewardScenario.scenarioId,
      deployments: [],
    },
    scenario: stewardScenario,
  },
  "9",
  new Date("2026-11-24T09:00:00Z"),
);

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, motion.flipMs + 100));
  });
}

async function slide() {
  await act(async () => {
    fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
  });
  await settle();
}

function circleByTestId(testID: string) {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .find((node) => node.props.testID === testID);
}

beforeEach(() => {
  activeScenario.mockReturnValue({
    view: { status: "live", notices: [], snapshot },
    refresh: jest.fn(async () => {}),
    dismissNotice: jest.fn(),
  } as unknown as ReturnType<typeof useActiveScenario>);
  report.mockResolvedValue({ ok: true, message: "" });
  queue.mockResolvedValue({
    id: "report-kgn",
    userId: "9",
    station: "KGN",
    reportedAt: "2026-11-24T09:05:00Z",
    scenarioId: stewardScenario.scenarioId,
    activationId: 1,
    event: "EN_ROUTE",
  });
  waiting.mockResolvedValue(null);
  rejection.mockResolvedValue(null);
});

afterEach(() => {
  resetRememberedStatuses();
});

describe("StewardView 21:9 map preview (MET-A-031, #466)", () => {
  jest.setTimeout(20000);

  it("marks only ownStation after BEKRÆFT (not a merely tapped list station) and keeps the map visible after check-in", async () => {
    render(
      <StewardView
        token="token"
        online
        onLogout={jest.fn()}
        onUnauthorized={jest.fn()}
      />,
    );
    await act(async () => {});

    expect(await screen.findByText("IKKE VALGT")).toBeTruthy();
    expect(circleByTestId("own-station-ring-KGN")).toBeUndefined();
    expect(circleByTestId("own-station-gap-KGN")).toBeUndefined();

    // Tapping a station in the list selects it before BEKRÆFT, without marking
    // it as ownStation on the map.
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Vælg KGN"));
    });
    expect(screen.getByLabelText("Vælg KGN")).toBeSelected();
    expect(circleByTestId("own-station-ring-KGN")).toBeUndefined();
    expect(circleByTestId("own-station-gap-KGN")).toBeUndefined();

    // Confirming assignment (BEKRÆFT) marks KGN with the outer ring over its
    // live coverage fill.
    await slide();
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
    expect(circleByTestId("own-station-ring-KGN")?.props.stroke).toBe(
      colors.text,
    );
    expect(circleByTestId("own-station-gap-KGN")?.props.stroke).toBe(
      colors.background,
    );
    expect(circleByTestId("station-dot-KGN")?.props.fill).toBe(
      coverageColors.gap.fill,
    );
    expect(circleByTestId("own-station-ring-ISB")).toBeUndefined();

    // Checking in (TJEK IND) keeps the 21:9 map visible with live covered fill
    // and the own-station outer ring while the card below shows tasks.
    await slide();
    expect(await screen.findByText(/^ANKOMMET/)).toBeTruthy();
    expect(screen.getByText("Opgaver på KGN")).toBeTruthy();
    expect(circleByTestId("own-station-ring-KGN")?.props.stroke).toBe(
      colors.text,
    );
    expect(circleByTestId("own-station-gap-KGN")?.props.stroke).toBe(
      colors.background,
    );
    expect(circleByTestId("station-dot-KGN")?.props.fill).toBe(
      coverageColors.covered.fill,
    );
    expect(
      screen
        .UNSAFE_queryAllByType(Line)
        .some(
          (line) =>
            line.props.stroke === colors.blockedTrack &&
            line.props.strokeDasharray === "10 6",
        ),
    ).toBe(true);
  });
});
