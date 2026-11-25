import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { BackHandler, type NativeEventSubscription } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { ScenarioMap } from "../../mobile/src/screens/ScenarioOverview";
import { StewardMapOverlay } from "../../mobile/src/screens/StewardMapOverlay";
import { StewardView } from "../../mobile/src/screens/StewardView";
import { fitViewBoxToAspect } from "../../mobile/src/screens/map-zoom";
import { resetRememberedStatuses } from "../../mobile/src/data/steward-status";
import type { MapNetwork } from "../../shared/network/network";
import {
  createSnapshotStore,
  type SnapshotStorage,
} from "../../shared/offline/scenario-snapshot";
import { useActiveScenario } from "../../shared/offline/use-active-scenario";
import { areaAroundStations } from "../../shared/scenario/affected-stations";
import { colors, coverageColors, palette } from "../../shared/Theme";
import {
  makeRouteScenario,
  makeRouteSnapshot,
  metroMapNetwork,
} from "../helpers/metro-map";

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
let mockNetwork: MapNetwork | null = null;
let mockUsingCached = false;
jest.mock("../../mobile/src/network/useNetwork", () => ({
  useNetwork: () => ({
    network: mockNetwork,
    usingCached: mockUsingCached,
    status: mockNetwork ? "ready" : "offline",
  }),
}));
jest.mock("../../mobile/src/offline/snapshot-store", () => ({
  snapshotStore: {},
}));
jest.mock("../../mobile/src/offline/waiting-report", () => ({
  waitingReport: jest.fn(async () => null),
  reportRejection: jest.fn(async () => null),
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

function showView(view: ReturnType<typeof useActiveScenario>["view"]) {
  activeScenario.mockReturnValue({
    view,
    refresh: jest.fn(async () => {}),
    dismissNotice: jest.fn(),
  } as unknown as ReturnType<typeof useActiveScenario>);
}

function memoryStorage(): SnapshotStorage {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}

function overlaySvgViewBox(): string | undefined {
  return within(screen.getByTestId("overlay-map-container")).UNSAFE_getByType(
    Svg,
  ).props.viewBox;
}

function hasHiddenAncestor(node: {
  props?: Record<string, unknown>;
  parent?: unknown;
}): boolean {
  let current: { props?: Record<string, unknown>; parent?: unknown } | null =
    node;
  while (current) {
    if (
      current.props?.accessibilityElementsHidden === true &&
      current.props?.importantForAccessibility === "no-hide-descendants"
    ) {
      return true;
    }
    current = (current.parent as typeof current) ?? null;
  }
  return false;
}

beforeEach(() => {
  mockNetwork = metroMapNetwork;
  mockUsingCached = false;
});

afterEach(() => {
  resetRememberedStatuses();
  mockNetwork = null;
  mockUsingCached = false;
  jest.restoreAllMocks();
});

describe("ScenarioMap expand preview (MET-A-031, #467)", () => {
  it("shows an expand cue and calls onExpand in one tap when a network is loaded", () => {
    const onExpand = jest.fn();
    render(
      <ScenarioMap
        snapshot={makeRouteSnapshot(makeRouteScenario())}
        network={metroMapNetwork}
        networkStatus="ready"
        onExpand={onExpand}
      />,
    );

    expect(
      screen.getByTestId("expand-map-cue", { includeHiddenElements: true }),
    ).toBeTruthy();
    const trigger = screen.getByLabelText("Åbn kort over hele linjen");
    expect(trigger.props.accessibilityRole).toBe("button");

    fireEvent.press(trigger);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it("hides the expand cue and does nothing when no network is loaded", () => {
    const onExpand = jest.fn();
    render(
      <ScenarioMap
        snapshot={makeRouteSnapshot(makeRouteScenario())}
        network={null}
        networkStatus="offline"
        onExpand={onExpand}
      />,
    );

    expect(
      screen.queryByTestId("expand-map-cue", { includeHiddenElements: true }),
    ).toBeNull();
    expect(screen.queryByLabelText("Åbn kort over hele linjen")).toBeNull();
    fireEvent.press(
      screen.getByText(
        "Kortet er ikke tilgængeligt offline. Opret forbindelse for at hente metronetværket.",
      ),
    );
    expect(onExpand).not.toHaveBeenCalled();
  });
});

describe("StewardMapOverlay (MET-A-031, #467)", () => {
  const position = (station: string) => metroMapNetwork.positions[station];

  it("shows the full active lineGroup by default, fits onLayout, and toggles Zoom ind / Zoom ud", () => {
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());
    render(
      <StewardMapOverlay
        snapshot={routeSnapshot}
        network={metroMapNetwork}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Kort · M1/M2")).toBeTruthy();
    const expectedFullDefault = fitViewBoxToAspect(
      areaAroundStations(["FOR", "KGN", "ISB", "KHC"], 90, position),
      0,
      0,
    );
    expect(overlaySvgViewBox()).toBe(expectedFullDefault);

    // M3/M4 stations remain excluded from the M1/M2 overlay.
    const overlayCircles = within(
      screen.getByTestId("overlay-map-container"),
    ).UNSAFE_queryAllByType(Circle);
    const circleIds = overlayCircles.map((node) => node.props.testID);
    expect(circleIds).toContain("station-dot-FOR");
    expect(circleIds).toContain("station-dot-KHC");
    expect(circleIds).not.toContain("station-dot-KBH");
    expect(circleIds).not.toContain("station-dot-ORI");

    // Layout update fits the viewBox to the measured box aspect ratio.
    fireEvent(screen.getByTestId("overlay-map-container"), "layout", {
      nativeEvent: { layout: { width: 600, height: 300 } },
    });
    const expectedFullLandscape = fitViewBoxToAspect(
      areaAroundStations(["FOR", "KGN", "ISB", "KHC"], 90, position),
      600,
      300,
    );
    expect(overlaySvgViewBox()).toBe(expectedFullLandscape);

    // Toggle to covered stretch and back to full line.
    const zoomButton = screen.getByLabelText("Zoom ind");
    expect(zoomButton.props.accessibilityRole).toBe("button");
    fireEvent.press(zoomButton);

    const expectedStretch = fitViewBoxToAspect(
      areaAroundStations(["KGN", "ISB"], 160, position),
      600,
      300,
    );
    expect(overlaySvgViewBox()).toBe(expectedStretch);
    expect(screen.getByLabelText("Zoom ud")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Zoom ud"));
    expect(overlaySvgViewBox()).toBe(expectedFullLandscape);
    expect(screen.getByLabelText("Zoom ind")).toBeTruthy();
  });

  it("hides the zoom toggle when covers has no positioned stations and resets if covers disappear while zoomed", () => {
    const withCovers = makeRouteSnapshot(makeRouteScenario());
    const withoutPositionedCovers = makeRouteSnapshot(
      makeRouteScenario({
        covers: [
          { trackNumber: 1, stationA: "UNKNOWN_A", stationB: "UNKNOWN_B" },
        ],
      }),
    );

    const view = render(
      <StewardMapOverlay
        snapshot={withCovers}
        network={metroMapNetwork}
        onClose={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByLabelText("Zoom ind"));
    expect(screen.getByLabelText("Zoom ud")).toBeTruthy();

    view.rerender(
      <StewardMapOverlay
        snapshot={withoutPositionedCovers}
        network={metroMapNetwork}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("overlay-zoom-toggle")).toBeNull();
    expect(screen.queryByLabelText("Zoom ind")).toBeNull();
    expect(screen.queryByLabelText("Zoom ud")).toBeNull();
    expect(overlaySvgViewBox()).toBe(
      fitViewBoxToAspect(
        areaAroundStations(["FOR", "KGN", "ISB", "KHC"], 90, position),
        0,
        0,
      ),
    );
  });

  it("renders the minimal Danish legend for staffing numbers, coverage dots, blocked tracks, and Din station", () => {
    render(
      <StewardMapOverlay
        snapshot={makeRouteSnapshot(makeRouteScenario())}
        network={metroMapNetwork}
        onClose={jest.fn()}
      />,
    );

    const legend = screen.getByTestId("map-overlay-legend");
    expect(within(legend).getByText("Tal = krævede stewards")).toBeTruthy();
    expect(within(legend).getByText("Bemandet")).toBeTruthy();
    expect(within(legend).getByText("Delvist")).toBeTruthy();
    expect(within(legend).getByText("Mangler")).toBeTruthy();
    expect(within(legend).getByText("Spærret spor")).toBeTruthy();
    expect(within(legend).getByText("Din station")).toBeTruthy();

    expect(screen.getByTestId("legend-coverage-covered")).toHaveStyle({
      backgroundColor: coverageColors.covered.fill,
    });
    expect(screen.getByTestId("legend-coverage-partial")).toHaveStyle({
      backgroundColor: coverageColors.partial.fill,
    });
    expect(screen.getByTestId("legend-coverage-gap")).toHaveStyle({
      backgroundColor: coverageColors.gap.fill,
    });

    const blockedLine = within(legend)
      .UNSAFE_queryAllByType(Line)
      .find((node) => node.props.testID === "legend-blocked-track");
    expect(blockedLine?.props.stroke).toBe(palette.metroDeepRed);
    expect(blockedLine?.props.strokeDasharray).toBeTruthy();

    const legendCircles = within(legend).UNSAFE_queryAllByType(Circle);
    expect(
      legendCircles.find(
        (node) => node.props.testID === "legend-own-station-gap",
      )?.props.stroke,
    ).toBe(colors.background);
    expect(
      legendCircles.find(
        (node) => node.props.testID === "legend-own-station-ring",
      )?.props.stroke,
    ).toBe(colors.text);
  });

  it("shows the missing-route alert when a scenario route cannot be resolved", () => {
    const broken = makeRouteScenario({
      versions: [
        {
          ...makeRouteScenario().versions[0],
          operatingPlan: {
            name: "Broken plan",
            patterns: [
              {
                operationType: "PENDULUM",
                routeCode: "KGN-UNKNOWN",
                trackNumber: 1,
                maximumTrains: 1,
                did: "11",
                description: "Broken route",
                route: [
                  { sequence: 1, station: "KGN" },
                  { sequence: 2, station: "UNKNOWN" },
                ],
              },
            ],
          },
        },
      ],
    });
    render(
      <StewardMapOverlay
        snapshot={makeRouteSnapshot(broken)}
        network={metroMapNetwork}
        onClose={jest.fn()}
      />,
    );

    const alert = screen.getByText(
      "En eller flere ruter kan ikke vises på kortet.",
    );
    expect(alert.props.accessibilityRole).toBe("alert");
  });

  it("closes on Android hardware back press", () => {
    let backCallback: (() => boolean | null | undefined) | undefined;
    const remove = jest.fn();
    jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation((_eventName, handler) => {
        backCallback = handler;
        return { remove } as unknown as NativeEventSubscription;
      });
    const onClose = jest.fn();

    const view = render(
      <StewardMapOverlay
        snapshot={makeRouteSnapshot(makeRouteScenario())}
        network={metroMapNetwork}
        onClose={onClose}
      />,
    );

    expect(backCallback).toBeDefined();
    expect(backCallback?.()).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe("StewardView map overlay integration (MET-A-031, #467)", () => {
  it("opens in one tap, hides background header and content from screen readers, and closes cleanly", async () => {
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());
    showView({ status: "live", notices: [], snapshot: routeSnapshot });
    render(
      <StewardView
        token="token"
        online
        onLogout={jest.fn()}
        onUnauthorized={jest.fn()}
      />,
    );
    await act(async () => {});

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(hasHiddenAncestor(screen.getByText("Log ud"))).toBe(false);
    expect(hasHiddenAncestor(screen.getByText("IKKE VALGT"))).toBe(false);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });

    const overlay = screen.getByTestId("steward-map-overlay");
    expect(overlay.props.accessibilityViewIsModal).toBe(true);
    expect(
      hasHiddenAncestor(
        screen.getByText("Log ud", { includeHiddenElements: true }),
      ),
    ).toBe(true);
    expect(
      hasHiddenAncestor(
        screen.getByText("IKKE VALGT", { includeHiddenElements: true }),
      ),
    ).toBe(true);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Luk kort"));
    });

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(hasHiddenAncestor(screen.getByText("Log ud"))).toBe(false);
    expect(hasHiddenAncestor(screen.getByText("IKKE VALGT"))).toBe(false);
  });

  it("auto-closes the overlay when the scenario is stood down while open", async () => {
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());
    showView({ status: "live", notices: [], snapshot: routeSnapshot });
    const element = () => (
      <StewardView
        token="token"
        online
        onLogout={jest.fn()}
        onUnauthorized={jest.fn()}
      />
    );
    const view = render(element());
    await act(async () => {});

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });
    expect(screen.getByTestId("steward-map-overlay")).toBeTruthy();

    showView({ status: "none", notices: [] });
    view.rerender(element());
    await act(async () => {});

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(hasHiddenAncestor(screen.getByText("Log ud"))).toBe(false);
    expect(hasHiddenAncestor(screen.getByText("Intet aktivt scenarie"))).toBe(
      false,
    );
  });

  it("renders the overlay cleanly from a stored offline ScenarioSnapshot with own-station ring", async () => {
    mockUsingCached = true;
    const store = createSnapshotStore(memoryStorage());
    const saved = makeRouteSnapshot(makeRouteScenario(), [
      {
        status: "MANNED",
        staff: "9",
        fulfills: "KGN",
        reportedAt: "2026-11-24T09:00:00Z",
        arrivedAt: "2026-11-24T09:00:00Z",
      },
    ]);
    await store.save(saved);
    const offlineSnapshot = (await store.load("9"))!;
    showView({ status: "copy", snapshot: offlineSnapshot, reason: "offline" });

    render(
      <StewardView
        token="token"
        online={false}
        onLogout={jest.fn()}
        onUnauthorized={jest.fn()}
      />,
    );
    await act(async () => {});

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });

    const overlayMap = within(screen.getByTestId("overlay-map-container"));
    const strokes = new Set(
      overlayMap.UNSAFE_queryAllByType(Line).map((line) => line.props.stroke),
    );
    expect(strokes).toContain(palette.metroLineOne);
    expect(strokes).toContain(palette.metroLineTwo);
    expect(strokes).toContain(colors.blockedTrack);
    expect(
      overlayMap
        .UNSAFE_queryAllByType(Circle)
        .find((node) => node.props.testID === "own-station-ring-KGN")?.props
        .stroke,
    ).toBe(colors.text);
    expect(screen.getByTestId("map-overlay-legend")).toBeTruthy();
  });
});
