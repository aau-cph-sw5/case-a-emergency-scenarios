import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  oneRowPerStation,
  ScenarioMap,
  ScenarioOverview,
} from "../../mobile/src/screens/ScenarioOverview";
import { Circle, Line, Text as SvgText } from "react-native-svg";
import {
  circleByTestId,
  makeRouteScenario,
  makeRouteSnapshot,
  metroMapNetwork,
} from "../helpers/metro-map";
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
  it.each(["online", "offline"] as const)(
    "draws the scoped M1/M2 routes in Metro colours from an %s snapshot, without DIDs or a colour switch",
    async (mode) => {
      let routeSnapshot = makeRouteSnapshot(makeRouteScenario());
      if (mode === "offline") {
        const store = createSnapshotStore(memoryStorage());
        await store.save(routeSnapshot);
        routeSnapshot = (await store.load("9"))!;
      }
      render(
        <ScenarioMap
          snapshot={routeSnapshot}
          network={metroMapNetwork}
          networkIsCached={mode === "offline"}
          networkStatus="ready"
        />,
      );

      const strokes = new Set(
        screen.UNSAFE_queryAllByType(Line).map((line) => line.props.stroke),
      );
      expect(strokes).toContain(palette.metroLineOne);
      expect(strokes).toContain(palette.metroLineTwo);
      expect(strokes).toContain(colors.blockedTrack);
      // M3 and M4 belong to the other line group.
      expect(strokes).not.toContain(palette.metroLineThree);
      expect(strokes).not.toContain(palette.metroLineFour);
      for (const station of ["KBH", "RAD", "GLS", "ORI"]) {
        expect(circleByTestId(`station-dot-${station}`)).toBeUndefined();
      }

      const svgTexts = screen
        .UNSAFE_queryAllByType(SvgText)
        .map((node) => [node.props.children].flat().join(""));
      expect(svgTexts).not.toContain("11");
      expect(svgTexts).not.toContain("22");
      expect(screen.queryByTestId("metro-line-controls")).toBeNull();
      expect(
        screen.queryByText("En eller flere ruter kan ikke vises på kortet."),
      ).toBeNull();
      expect(screen.queryByText("Viser gemt metronetværk.") !== null).toBe(
        mode === "offline",
      );
    },
  );

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

  it("draws the own-station outer ring over live coverage and clears it on checkout", () => {
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

  it.each([
    [
      "covers",
      makeRouteScenario({ covers: [] }),
      makeRouteScenario(),
      (line: { props: { stroke: string; strokeDasharray?: string } }) =>
        line.props.stroke === colors.blockedTrack &&
        line.props.strokeDasharray === "10 6",
    ],
    [
      "operating patterns",
      makeRouteScenario({
        versions: [
          {
            ...makeRouteScenario().versions[0],
            operatingPlan: {
              name: "M1 only",
              patterns: [
                makeRouteScenario().versions[0].operatingPlan.patterns[0],
              ],
            },
          },
        ],
      }),
      makeRouteScenario(),
      (line: { props: { stroke: string } }) =>
        line.props.stroke === palette.metroLineTwo,
    ],
  ])(
    "draws the map again when the %s change under the same scenario version",
    (_change, before, after, isNewLine) => {
      const view = render(
        <ScenarioMap
          snapshot={makeRouteSnapshot(before)}
          network={metroMapNetwork}
          networkStatus="ready"
        />,
      );
      expect(screen.UNSAFE_queryAllByType(Line).some(isNewLine)).toBe(false);

      view.rerender(
        <ScenarioMap
          snapshot={makeRouteSnapshot(after)}
          network={metroMapNetwork}
          networkStatus="ready"
        />,
      );
      expect(screen.UNSAFE_queryAllByType(Line).some(isNewLine)).toBe(true);
    },
  );
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
