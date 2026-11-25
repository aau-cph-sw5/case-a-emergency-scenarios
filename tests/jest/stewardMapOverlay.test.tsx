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
  isHiddenFromAccessibility,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { BackHandler, type NativeEventSubscription } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { ScenarioMap } from "../../mobile/src/screens/ScenarioOverview";
import { StewardMapOverlay } from "../../mobile/src/screens/StewardMapOverlay";
import { StewardView } from "../../mobile/src/screens/StewardView";
import { deriveStewardMapModel } from "../../mobile/src/screens/steward-map-data";
import { resetRememberedStatuses } from "../../mobile/src/data/steward-status";
import type { MapNetwork } from "../../shared/network/network";
import type { NetworkStatus } from "../../mobile/src/network/useNetwork";
import {
  createSnapshotStore,
  type SnapshotStorage,
} from "../../shared/offline/scenario-snapshot";
import { useActiveScenario } from "../../shared/offline/use-active-scenario";
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
const mockSocketHandlers = new Map<string, Set<(...args: unknown[]) => void>>();
jest.mock("../../mobile/src/socket", () => ({
  socket: {
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      const set = mockSocketHandlers.get(event) ?? new Set();
      set.add(handler);
      mockSocketHandlers.set(event, set);
    }),
    off: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      mockSocketHandlers.get(event)?.delete(handler);
    }),
  },
}));
let mockNetwork: MapNetwork | null = null;
let mockUsingCached = false;
let mockNetworkStatus: NetworkStatus = "ready";
jest.mock("../../mobile/src/network/useNetwork", () => ({
  useNetwork: () => ({
    network: mockNetwork,
    usingCached: mockUsingCached,
    status: mockNetwork ? mockNetworkStatus : "offline",
  }),
}));
jest.mock("../../mobile/src/data/station-thread", () => ({
  ...(jest.requireActual("../../mobile/src/data/station-thread") as Record<
    string,
    unknown
  >),
  readStationThread: jest.fn(async (_token: string, station: string) => ({
    ok: true,
    value: { activationId: 1, station, messages: [] },
  })),
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

function parseViewBox(viewBox: string | undefined) {
  expect(viewBox).toBeDefined();
  const [x, y, width, height] = viewBox!.split(" ").map(Number);
  return { x, y, width, height };
}

function containsPoint(
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

function overlaySvgViewBox(): string | undefined {
  return within(screen.getByTestId("overlay-map-container")).UNSAFE_getByType(
    Svg,
  ).props.viewBox;
}

function emitSocket(event: string, payload: unknown) {
  for (const handler of mockSocketHandlers.get(event) ?? []) {
    handler(payload);
  }
}

beforeEach(() => {
  mockNetwork = metroMapNetwork;
  mockUsingCached = false;
  mockNetworkStatus = "ready";
  mockSocketHandlers.clear();
});

afterEach(() => {
  resetRememberedStatuses();
  mockNetwork = null;
  mockUsingCached = false;
  mockNetworkStatus = "ready";
  mockSocketHandlers.clear();
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
  it("shows the full active lineGroup by default and toggles between full line and covered stretch", () => {
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());
    const model = deriveStewardMapModel(routeSnapshot, metroMapNetwork);
    render(
      <StewardMapOverlay
        snapshot={routeSnapshot}
        model={model}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Kort · M1/M2")).toBeTruthy();
    const fullBox = parseViewBox(overlaySvgViewBox());
    for (const station of ["FOR", "KGN", "ISB", "KHC"]) {
      expect(containsPoint(fullBox, metroMapNetwork.positions[station])).toBe(
        true,
      );
    }

    // M3/M4 stations remain excluded from the M1/M2 overlay.
    const overlayCircles = within(
      screen.getByTestId("overlay-map-container"),
    ).UNSAFE_queryAllByType(Circle);
    const circleIds = overlayCircles.map((node) => node.props.testID);
    expect(circleIds).toContain("station-dot-FOR");
    expect(circleIds).toContain("station-dot-KHC");
    expect(circleIds).not.toContain("station-dot-KBH");
    expect(circleIds).not.toContain("station-dot-ORI");

    // Toggle to covered stretch and back to full line.
    const zoomButton = screen.getByLabelText("Zoom ind");
    expect(zoomButton.props.accessibilityRole).toBe("button");
    fireEvent.press(zoomButton);

    const zoomedBox = parseViewBox(overlaySvgViewBox());
    expect(zoomedBox.width * zoomedBox.height).toBeLessThan(
      fullBox.width * fullBox.height,
    );
    for (const station of ["KGN", "ISB"]) {
      expect(containsPoint(zoomedBox, metroMapNetwork.positions[station])).toBe(
        true,
      );
    }
    expect(screen.getByLabelText("Zoom ud")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Zoom ud"));
    const restoredBox = parseViewBox(overlaySvgViewBox());
    expect(restoredBox).toEqual(fullBox);
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
        model={deriveStewardMapModel(withCovers, metroMapNetwork)}
        onClose={jest.fn()}
      />,
    );
    const fullBox = parseViewBox(overlaySvgViewBox());
    fireEvent.press(screen.getByLabelText("Zoom ind"));
    expect(screen.getByLabelText("Zoom ud")).toBeTruthy();

    view.rerender(
      <StewardMapOverlay
        snapshot={withoutPositionedCovers}
        model={deriveStewardMapModel(withoutPositionedCovers, metroMapNetwork)}
        onClose={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("overlay-zoom-toggle")).toBeNull();
    expect(screen.queryByLabelText("Zoom ind")).toBeNull();
    expect(screen.queryByLabelText("Zoom ud")).toBeNull();
    expect(parseViewBox(overlaySvgViewBox())).toEqual(fullBox);
  });

  it("renders the minimal Danish legend for staffing numbers, coverage dots, blocked tracks, and Din station", () => {
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());
    render(
      <StewardMapOverlay
        snapshot={routeSnapshot}
        model={deriveStewardMapModel(routeSnapshot, metroMapNetwork)}
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

  it("shows cached, incomplete, missing-stretch, and missing-route notes in the overlay", () => {
    const broken = makeRouteScenario({
      covers: [{ trackNumber: 1, stationA: "KGN", stationB: "UNKNOWN" }],
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
    const brokenSnapshot = makeRouteSnapshot(broken);
    render(
      <StewardMapOverlay
        snapshot={brokenSnapshot}
        model={deriveStewardMapModel(brokenSnapshot, metroMapNetwork)}
        networkIsCached
        networkStatus="incomplete"
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Viser gemt metronetværk.")).toBeTruthy();
    expect(
      screen.getByText("Det hentede metronetværk er ufuldstændigt."),
    ).toBeTruthy();
    const missingStretchAlert = screen.getByText(
      "Den berørte strækning kan ikke vises fuldt ud på dette kort.",
    );
    const missingRoutesAlert = screen.getByText(
      "En eller flere ruter kan ikke vises på kortet.",
    );
    expect(missingStretchAlert.props.accessibilityRole).toBe("alert");
    expect(missingRoutesAlert.props.accessibilityRole).toBe("alert");
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
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());

    const view = render(
      <StewardMapOverlay
        snapshot={routeSnapshot}
        model={deriveStewardMapModel(routeSnapshot, metroMapNetwork)}
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
    expect(isHiddenFromAccessibility(screen.getByText("Log ud"))).toBe(false);
    expect(isHiddenFromAccessibility(screen.getByText("IKKE VALGT"))).toBe(
      false,
    );

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });

    const overlay = screen.getByTestId("steward-map-overlay");
    expect(isHiddenFromAccessibility(overlay)).toBe(false);
    expect(
      isHiddenFromAccessibility(
        screen.getByText("Log ud", { includeHiddenElements: true }),
      ),
    ).toBe(true);
    expect(
      isHiddenFromAccessibility(
        screen.getByText("IKKE VALGT", { includeHiddenElements: true }),
      ),
    ).toBe(true);

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Luk kort"));
    });

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(isHiddenFromAccessibility(screen.getByText("Log ud"))).toBe(false);
    expect(isHiddenFromAccessibility(screen.getByText("IKKE VALGT"))).toBe(
      false,
    );
  });

  it("keeps StationChat tab and notice above the map overlay when MANNED and closes the map when chat opens", async () => {
    const mannedSnapshot = makeRouteSnapshot(makeRouteScenario(), [
      {
        status: "MANNED",
        staff: "9",
        fulfills: "KGN",
        reportedAt: "2026-11-24T09:00:00Z",
        arrivedAt: "2026-11-24T09:00:00Z",
      },
    ]);
    showView({ status: "live", notices: [], snapshot: mannedSnapshot });
    const view = render(
      <StewardView
        token="token"
        online
        onLogout={jest.fn()}
        onUnauthorized={jest.fn()}
      />,
    );
    await act(async () => {});

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });

    await act(async () => {
      emitSocket("station-message", {
        message: {
          id: 42,
          activationId: mannedSnapshot.state.activationId,
          station: "KGN",
          sender: "CONTROL_ROOM",
          text: "Skift til spor 1",
          writtenAt: "2026-11-24T09:01:00Z",
          receivedAt: "2026-11-24T09:01:00Z",
          clientMessageId: "11111111-1111-4111-8111-111111111111",
        },
        thread: {
          activationId: mannedSnapshot.state.activationId,
          station: "KGN",
          state: "ANSWERED",
          unansweredSince: null,
          lastMessageAt: "2026-11-24T09:01:00Z",
        },
        sentAt: "2026-11-24T09:01:00Z",
      });
    });

    expect(screen.getByTestId("steward-map-overlay")).toBeTruthy();
    expect(screen.getByTestId("chat-tab")).toBeTruthy();
    expect(screen.getByTestId("message-notice")).toBeTruthy();
    expect(isHiddenFromAccessibility(screen.getByTestId("chat-tab"))).toBe(
      false,
    );
    expect(
      isHiddenFromAccessibility(screen.getByTestId("message-notice")),
    ).toBe(false);

    // StationChat renders after StewardMapOverlay so its tab and notice sit on top.
    const serialized = JSON.stringify(view.toJSON());
    const overlayPos = serialized.indexOf('"steward-map-overlay"');
    const chatTabPos = serialized.indexOf('"chat-tab"');
    const noticePos = serialized.indexOf('"message-notice"');
    expect(overlayPos).toBeGreaterThan(-1);
    expect(chatTabPos).toBeGreaterThan(overlayPos);
    expect(noticePos).toBeGreaterThan(overlayPos);

    // Opening chat closes the map overlay.
    await act(async () => {
      fireEvent.press(screen.getByTestId("chat-tab"));
    });
    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(screen.getByTestId("station-chat")).toBeTruthy();
  });

  it("closes the map overlay on Android BackHandler inside StewardView without resubscribing on rerender", async () => {
    let backCallback: (() => boolean | null | undefined) | undefined;
    const remove = jest.fn();
    const addListenerSpy = jest
      .spyOn(BackHandler, "addEventListener")
      .mockImplementation((_eventName, handler) => {
        backCallback = handler;
        return { remove } as unknown as NativeEventSubscription;
      });
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
    expect(addListenerSpy).toHaveBeenCalledTimes(1);

    // Re-rendering StewardView keeps the same BackHandler subscription.
    view.rerender(element());
    await act(async () => {});
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();

    await act(async () => {
      expect(backCallback?.()).toBe(true);
    });
    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("resets zoom to the full line after closing and reopening and on scenario switch", async () => {
    const firstSnapshot = makeRouteSnapshot(makeRouteScenario());
    const secondSnapshot = {
      ...makeRouteSnapshot(makeRouteScenario({ name: "Switched scenario" })),
      state: {
        ...firstSnapshot.state,
        activationId: firstSnapshot.state.activationId + 1,
      },
    };
    showView({ status: "live", notices: [], snapshot: firstSnapshot });
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

    // Open, zoom in, close, reopen -> zoom resets.
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });
    const fullBox = parseViewBox(overlaySvgViewBox());
    fireEvent.press(screen.getByLabelText("Zoom ind"));
    expect(screen.getByLabelText("Zoom ud")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Luk kort"));
    });
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });
    expect(screen.getByLabelText("Zoom ind")).toBeTruthy();
    expect(parseViewBox(overlaySvgViewBox())).toEqual(fullBox);

    // Zoom in, switch scenario (new activationId) -> zoom resets to full line.
    fireEvent.press(screen.getByLabelText("Zoom ind"));
    expect(screen.getByLabelText("Zoom ud")).toBeTruthy();

    showView({ status: "live", notices: [], snapshot: secondSnapshot });
    view.rerender(element());
    await act(async () => {});

    expect(screen.getByText("Switched scenario")).toBeTruthy();
    expect(screen.getByLabelText("Zoom ind")).toBeTruthy();
    expect(parseViewBox(overlaySvgViewBox())).toEqual(fullBox);
  });

  it("auto-closes the overlay when network becomes null while open", async () => {
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

    mockNetwork = null;
    view.rerender(element());
    await act(async () => {});

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(isHiddenFromAccessibility(screen.getByText("Log ud"))).toBe(false);

    // Network returning keeps the overlay closed until tapped again.
    mockNetwork = metroMapNetwork;
    view.rerender(element());
    await act(async () => {});
    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
  });

  it("auto-closes the overlay when the scenario transitions to stood-down or none", async () => {
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

    // Transition to stood-down.
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });
    expect(screen.getByTestId("steward-map-overlay")).toBeTruthy();

    showView({
      status: "stood-down",
      notices: [
        {
          id: "stood-down-1",
          kind: "stood-down",
          scenarioName: routeSnapshot.scenario.name,
        },
      ],
    });
    view.rerender(element());
    await act(async () => {});

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(isHiddenFromAccessibility(screen.getByText("Log ud"))).toBe(false);

    // Re-activate, open overlay again, then transition to none.
    showView({ status: "live", notices: [], snapshot: routeSnapshot });
    view.rerender(element());
    await act(async () => {});
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Åbn kort over hele linjen"));
    });
    expect(screen.getByTestId("steward-map-overlay")).toBeTruthy();

    showView({ status: "none", notices: [] });
    view.rerender(element());
    await act(async () => {});

    expect(screen.queryByTestId("steward-map-overlay")).toBeNull();
    expect(isHiddenFromAccessibility(screen.getByText("Log ud"))).toBe(false);
    expect(
      isHiddenFromAccessibility(screen.getByText("Intet aktivt scenarie")),
    ).toBe(false);
  });

  it("renders the overlay cleanly from a stored offline ScenarioSnapshot with cached-network note and own-station ring", async () => {
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

    const overlay = screen.getByTestId("steward-map-overlay");
    expect(within(overlay).getByText("Viser gemt metronetværk.")).toBeTruthy();
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
