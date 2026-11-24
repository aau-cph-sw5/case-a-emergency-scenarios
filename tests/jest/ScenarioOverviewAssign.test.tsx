import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  oneRowPerStation,
  ScenarioMap,
  ScenarioOverview,
} from "../../mobile/src/screens/ScenarioOverview";
import { Circle, Line, Text as SvgText } from "react-native-svg";
import { network as networkFixture } from "../helpers/network";
import { buildMapNetwork } from "../../shared/network/network";
import type { Network } from "../../shared/types/v1/network";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import {
  buildSnapshot,
  createSnapshotStore,
  type SnapshotStorage,
} from "../../shared/offline/scenario-snapshot";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { colors, coverageColors, palette, steward } from "../../shared/Theme";

// User 9 has no deployment in the fixture, so the steward has no status yet.
const snapshot = buildSnapshot(
  {
    active: true,
    state: activeState as ScenarioState,
    scenario: scenario as Scenario,
  },
  "9",
  new Date(),
);

describe("ScenarioMap network (MET-A-030)", () => {
  it("draws scenario stations at the provided network positions", () => {
    const network = buildMapNetwork(networkFixture as Network);
    render(
      <ScenarioMap snapshot={snapshot} network={network} networkIsCached />,
    );
    const dots = screen
      .UNSAFE_queryAllByType(Circle)
      .map((dot) => [dot.props.cx, dot.props.cy]);
    expect(dots).toContainEqual([100, 200]);
    expect(dots).toContainEqual([200, 200]);
    expect(screen.getByText("Viser gemt metronetværk.")).toBeTruthy();
  });

  it("draws the affected track from the scenario when the cached network lacks it", () => {
    const network = buildMapNetwork(networkFixture as Network);
    render(
      <ScenarioMap
        snapshot={snapshot}
        network={{ ...network, segments: [] }}
        networkIsCached
      />,
    );
    expect(
      screen.queryByText(
        "Den berørte strækning kan ikke vises fuldt ud på dette kort.",
      ),
    ).toBeNull();
    expect(screen.UNSAFE_queryAllByType(Circle).length).toBeGreaterThan(0);
  });

  it("warns when the cached network cannot show the affected track", () => {
    const network = buildMapNetwork(networkFixture as Network);
    render(
      <ScenarioMap
        snapshot={snapshot}
        network={{ ...network, positions: {} }}
        networkIsCached
      />,
    );
    expect(
      screen.getByText(
        "Den berørte strækning kan ikke vises fuldt ud på dette kort.",
      ),
    ).toBeTruthy();
  });

  it("explains when no network is available offline", () => {
    render(
      <ScenarioMap
        snapshot={snapshot}
        network={null}
        networkStatus="offline"
      />,
    );
    expect(
      screen.getByText(
        "Kortet er ikke tilgængeligt offline. Opret forbindelse for at hente metronetværket.",
      ),
    ).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(Circle)).toHaveLength(0);
  });
});

// Four-line test network with distinct M1/M2 and M3/M4 branches and Metro
// brand colours so line-group scoping and per-track closures are observable.
const metroNetworkFixture: Network = {
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

const metroMapNetwork = buildMapNetwork(metroNetworkFixture);

function makeRouteScenario(overrides: Partial<Scenario> = {}): Scenario {
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

function makeRouteSnapshot(
  routeScenario: Scenario,
  deployments: ScenarioState["deployments"] = [],
  userId = "9",
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
    userId,
    new Date("2026-11-24T09:00:00Z"),
  );
}

function circleByTestId(testID: string) {
  return screen
    .UNSAFE_queryAllByType(Circle)
    .find((node) => node.props.testID === testID);
}

function svgTextByTestId(testID: string) {
  return screen
    .UNSAFE_queryAllByType(SvgText)
    .find((node) => node.props.testID === testID);
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

describe("ScenarioMap routes and closures (MET-A-031, #466)", () => {
  it("renders scoped M1/M2 routes in Metro colours both online and from a saved offline snapshot, omitting DIDs and colour switch", async () => {
    const onlineSnapshot = makeRouteSnapshot(makeRouteScenario());
    const store = createSnapshotStore(memoryStorage());
    await store.save(onlineSnapshot);
    const offlineSnapshot = await store.load("9");
    expect(offlineSnapshot).not.toBeNull();

    for (const [mode, currentSnapshot, cached] of [
      ["online", onlineSnapshot, false],
      ["offline", offlineSnapshot!, true],
    ] as const) {
      const view = render(
        <ScenarioMap
          snapshot={currentSnapshot}
          network={metroMapNetwork}
          networkIsCached={cached}
          networkStatus="ready"
        />,
      );

      const lines = screen.UNSAFE_queryAllByType(Line);
      const strokes = new Set(lines.map((line) => line.props.stroke));
      expect(strokes.has(palette.metroLineOne)).toBe(true);
      expect(strokes.has(palette.metroLineTwo)).toBe(true);
      expect(strokes.has(colors.blockedTrack)).toBe(true);
      // M3 and M4 belong to the other line group and must not be drawn.
      expect(strokes.has(palette.metroLineThree)).toBe(false);
      expect(strokes.has(palette.metroLineFour)).toBe(false);
      expect(circleByTestId("station-dot-KBH")).toBeUndefined();
      expect(circleByTestId("station-dot-RAD")).toBeUndefined();
      expect(circleByTestId("station-dot-GLS")).toBeUndefined();
      expect(circleByTestId("station-dot-ORI")).toBeUndefined();

      // Destination IDs and colour-mode switcher are omitted on mobile.
      expect(screen.queryByLabelText("Destination IDs")).toBeNull();
      expect(screen.queryByText(/Destination ID/)).toBeNull();
      expect(screen.queryByText(/Farver efter/)).toBeNull();
      expect(screen.queryByText("Metrolinje")).toBeNull();
      expect(
        screen.queryByText("En eller flere ruter kan ikke vises på kortet."),
      ).toBeNull();

      if (mode === "offline") {
        expect(screen.getByText("Viser gemt metronetværk.")).toBeTruthy();
      } else {
        expect(screen.queryByText("Viser gemt metronetværk.")).toBeNull();
      }

      view.unmount();
    }
  });

  it("draws a single-track closure dashed next to a solid running lane on the same segment", () => {
    const routeSnapshot = makeRouteSnapshot(makeRouteScenario());
    render(
      <ScenarioMap
        snapshot={routeSnapshot}
        network={metroMapNetwork}
        networkStatus="ready"
      />,
    );

    const kgnToIsb = screen
      .UNSAFE_queryAllByType(Line)
      .filter(
        (line) =>
          Math.min(line.props.x1, line.props.x2) === 200 &&
          Math.max(line.props.x1, line.props.x2) === 300 &&
          line.props.y1 === line.props.y2,
      );
    const solidRunning = kgnToIsb.filter(
      (line) =>
        line.props.stroke === palette.metroLineOne &&
        line.props.strokeDasharray === undefined,
    );
    const dashedClosed = kgnToIsb.filter(
      (line) =>
        line.props.stroke === colors.blockedTrack &&
        line.props.strokeDasharray === "10 6",
    );

    expect(solidRunning).toHaveLength(2);
    expect(dashedClosed).toHaveLength(2);
    // Track 1 and track 2 sit on opposite sides of the station centreline (y=200).
    expect(solidRunning.every((line) => line.props.y1 < 200)).toBe(true);
    expect(dashedClosed.every((line) => line.props.y1 > 200)).toBe(true);
  });

  it("draws the own-station outer ring over live coverage without Metro Summer Red and clears it on checkout", () => {
    const partialSnapshot = makeRouteSnapshot(makeRouteScenario(), [
      {
        status: "MANNED",
        staff: "9",
        fulfills: "KGN",
        reportedAt: "2026-11-24T09:00:00Z",
        arrivedAt: "2026-11-24T09:00:00Z",
      },
    ]);

    const view = render(
      <ScenarioMap
        snapshot={partialSnapshot}
        assignedStation="KGN"
        network={metroMapNetwork}
        networkStatus="ready"
      />,
    );

    expect(circleByTestId("station-dot-KGN")?.props.fill).toBe(
      coverageColors.partial.fill,
    );
    expect(circleByTestId("station-dot-KGN")?.props.fill).not.toBe(
      palette.metroSummerRed,
    );
    expect(circleByTestId("own-station-gap-KGN")?.props.stroke).toBe(
      colors.background,
    );
    expect(circleByTestId("own-station-ring-KGN")?.props.stroke).toBe(
      colors.text,
    );
    expect(svgTextByTestId("station-label-KGN")?.props.fill).toBe(colors.text);

    // Other required stations keep coverage fill without an outer ring.
    expect(circleByTestId("station-dot-ISB")?.props.fill).toBe(
      coverageColors.gap.fill,
    );
    expect(circleByTestId("own-station-gap-ISB")).toBeUndefined();
    expect(circleByTestId("own-station-ring-ISB")).toBeUndefined();

    // After check-out, no own-station ring is shown.
    view.rerender(
      <ScenarioMap
        snapshot={partialSnapshot}
        checkedOutStation="KGN"
        network={metroMapNetwork}
        networkStatus="ready"
      />,
    );
    expect(circleByTestId("own-station-gap-KGN")).toBeUndefined();
    expect(circleByTestId("own-station-ring-KGN")).toBeUndefined();
  });

  it("shows the missing-route alert alongside cached, incomplete, and missing-stretch notes", () => {
    const brokenScenario = makeRouteScenario({
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
                description: "Unresolvable route",
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
    const brokenSnapshot = makeRouteSnapshot(brokenScenario);

    render(
      <ScenarioMap
        snapshot={brokenSnapshot}
        network={metroMapNetwork}
        networkIsCached
        networkStatus="incomplete"
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

  it("re-renders MapCard when covers or patterns change under the same scenarioId and version", () => {
    const initialScenario = makeRouteScenario({ covers: [] });
    const updatedScenario = makeRouteScenario({
      covers: [{ trackNumber: 2, stationA: "KGN", stationB: "ISB" }],
    });

    const view = render(
      <ScenarioMap
        snapshot={makeRouteSnapshot(initialScenario)}
        network={metroMapNetwork}
        networkStatus="ready"
      />,
    );

    expect(
      screen
        .UNSAFE_queryAllByType(Line)
        .some((line) => line.props.stroke === colors.blockedTrack),
    ).toBe(false);

    view.rerender(
      <ScenarioMap
        snapshot={makeRouteSnapshot(updatedScenario)}
        network={metroMapNetwork}
        networkStatus="ready"
      />,
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

describe("ScenarioOverview stations (MET-A-015, #263, #376)", () => {
  it("selects the tapped station while the steward has none (#376)", () => {
    const onSelect = jest.fn();
    render(<ScenarioOverview snapshot={snapshot} onSelect={onSelect} />);
    expect(screen.getByText("Vælg nærmeste station")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Vælg Station B"));
    expect(onSelect).toHaveBeenCalledWith("Station B");
  });

  it("marks the selected station", () => {
    render(
      <ScenarioOverview
        snapshot={snapshot}
        onSelect={jest.fn()}
        selected="Station B"
      />,
    );
    expect(screen.getByLabelText("Vælg Station B")).toBeSelected();
  });

  it("offers no selection when the steward cannot choose a station", () => {
    render(<ScenarioOverview snapshot={snapshot} />);
    expect(screen.queryByLabelText("Vælg Station B")).toBeNull();
    expect(screen.getByText("Påvirkede stationer")).toBeTruthy();
  });

  it("shows the tasks only after check in", () => {
    render(
      <ScenarioOverview snapshot={snapshot} assignedStation="Station B" />,
    );
    expect(screen.queryByText("Opgaver på Station B")).toBeNull();
    screen.unmount();
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        ownArrived
      />,
    );
    expect(screen.getByText("Opgaver på Station B")).toBeTruthy();
  });

  // Cancelling is done in the status card, not in the list (#376): the own
  // row is an ordinary row there, with its staffing under the name.
  it("has no cancel in the list", () => {
    render(
      <ScenarioOverview snapshot={snapshot} assignedStation="Station B" />,
    );
    expect(screen.queryByText("‹‹ Swipe for at annullere")).toBeNull();
    expect(screen.queryByLabelText("Annullér Station B")).toBeNull();
  });

  // A station with two requirement rows is listed once, needing both (#376).
  it("lists a station once, also when it has several requirement rows", () => {
    const base = (scenario as Scenario).versions[0];
    const row = base.stationRequirements![0];
    const twoRows = buildSnapshot(
      {
        active: true,
        state: { ...(activeState as ScenarioState), deployments: [] },
        scenario: {
          ...(scenario as Scenario),
          versions: [
            {
              ...base,
              stationRequirements: [
                row,
                { ...row, placement: "Second placement" },
              ],
            },
          ],
        },
      },
      "9",
      new Date(),
    );
    render(<ScenarioOverview snapshot={twoRows} onSelect={jest.fn()} />);
    expect(screen.getAllByLabelText("Vælg Station B")).toHaveLength(1);
    expect(screen.getByText(`0/${row.minimumStaffing * 2}`)).toBeTruthy();
  });

  it("merges rows in the order each station first appears", () => {
    const row = (scenario as Scenario).versions[0].stationRequirements![0];
    const merged = oneRowPerStation([
      { ...row, station: "A", minimumStaffing: 1 },
      { ...row, station: "B", minimumStaffing: 1 },
      { ...row, station: "A", minimumStaffing: 2 },
    ]);
    expect(merged.map((r) => [r.station, r.minimumStaffing])).toEqual([
      ["A", 3],
      ["B", 1],
    ]);
  });

  it("shows how many have arrived out of the stewards needed", () => {
    render(<ScenarioOverview snapshot={snapshot} />);
    expect(screen.getByText("0/1")).toBeTruthy();
  });

  // Two colours only (#375): red when nobody is there or on the way, black
  // otherwise. In the fixture a steward is on the way to Station B.
  it("shows the count in black when someone is on the way, red when nobody is", () => {
    render(<ScenarioOverview snapshot={snapshot} />);
    expect(screen.getByText("0/1")).toHaveStyle({ color: colors.text });
    screen.unmount();
    const nobody = buildSnapshot(
      {
        active: true,
        state: { ...(activeState as ScenarioState), deployments: [] },
        scenario: scenario as Scenario,
      },
      "9",
      new Date(),
    );
    render(<ScenarioOverview snapshot={nobody} />);
    expect(screen.getByText("0/1")).toHaveStyle({ color: steward.nobody });
  });

  // The own row is filled yellow on the way and green after check in.
  // On the way the own row is the yellow one; after check in the same card
  // shows the tasks of the own station instead of the stations (#376).
  it("shows the own row on the way and the tasks after check in", () => {
    render(
      <ScenarioOverview snapshot={snapshot} assignedStation="Station B" />,
    );
    expect(screen.getByText("0/1")).toHaveStyle({ color: colors.text });
    screen.unmount();
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        ownArrived
      />,
    );
    expect(screen.getByText("Opgaver på Station B")).toBeTruthy();
    expect(screen.queryByText("0/1")).toBeNull();
  });

  // A station with several requirement rows lists the tasks of all of them,
  // numbered from 1 (#377).
  it("lists the tasks of all the station's rows, numbered from 1", () => {
    const base = (scenario as Scenario).versions[0];
    const row = base.stationRequirements![0];
    const twoRows = buildSnapshot(
      {
        active: true,
        state: activeState as ScenarioState,
        scenario: {
          ...(scenario as Scenario),
          versions: [
            {
              ...base,
              stationRequirements: [
                { ...row, actions: [{ sequence: 1, instruction: "First" }] },
                {
                  ...row,
                  placement: "Second placement",
                  actions: [{ sequence: 1, instruction: "Second" }],
                },
              ],
            },
          ],
        },
      },
      "9",
      new Date(),
    );
    render(
      <ScenarioOverview
        snapshot={twoRows}
        assignedStation="Station B"
        ownArrived
      />,
    );
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("2.")).toBeTruthy();
  });

  // After check in the stations open on request, in the same card, and the
  // tasks close to their strip; the strip opens them again (#376).
  it("opens the stations and the tasks again after check in", () => {
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        ownArrived
      />,
    );
    fireEvent.press(screen.getByText("Vis alle 1"));
    expect(screen.getByText("0/1")).toHaveStyle({ color: colors.textInverse });
    expect(screen.queryByLabelText("Din opgave")).toBeNull();
    fireEvent.press(screen.getByText("Vis opgaver"));
    expect(screen.getByLabelText("Din opgave")).toBeTruthy();
    expect(screen.queryByText("0/1")).toBeNull();
  });

  // After checking out the steward has left the station; the row says so
  // instead of "Din station" (#310).
  describe("after checking out", () => {
    // The server keeps the steward as staff on a checked-out deployment.
    const checkedOut = buildSnapshot(
      {
        active: true,
        state: {
          ...(activeState as ScenarioState),
          deployments: [
            {
              status: "CHECKED_OUT",
              staff: "9",
              fulfills: "Station B",
              reportedAt: "2026-11-08T10:00:00Z",
              arrivedAt: "2026-11-08T09:00:00Z",
            },
          ],
        },
        scenario: scenario as Scenario,
      },
      "9",
      new Date(),
    );

    it("says the steward checked out from the station, which can be chosen again", () => {
      render(<ScenarioOverview snapshot={checkedOut} onSelect={jest.fn()} />);
      expect(screen.getByText("Tjekket ud herfra")).toBeTruthy();
      expect(screen.getByLabelText("Vælg Station B")).toBeTruthy();
    });

    it("follows the app's check-out while the deployments still say arrived", () => {
      const stillArrived = buildSnapshot(
        {
          active: true,
          state: {
            ...(activeState as ScenarioState),
            deployments: [
              {
                status: "MANNED",
                staff: "9",
                fulfills: "Station B",
                reportedAt: "2026-11-08T09:00:00Z",
                arrivedAt: "2026-11-08T09:00:00Z",
              },
            ],
          },
          scenario: scenario as Scenario,
        },
        "9",
        new Date(),
      );
      render(
        <ScenarioOverview
          snapshot={stillArrived}
          onSelect={jest.fn()}
          checkedOutStation="Station B"
        />,
      );
      expect(screen.getByText("Tjekket ud herfra")).toBeTruthy();
    });
  });
});
