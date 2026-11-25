import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";
import { BackHandler, type NativeEventSubscription } from "react-native";
import { Circle, Line } from "react-native-svg";
import { StewardMapOverlay } from "../../mobile/src/screens/StewardMapOverlay";
import { deriveStewardMapModel } from "../../mobile/src/screens/steward-map-data";
import { colors, coverageColors, palette } from "../../shared/Theme";
import {
  containsPoint,
  makeRouteScenario,
  makeRouteSnapshot,
  metroMapNetwork,
  overlaySvgViewBox,
  parseViewBox,
} from "../helpers/metro-map";

afterEach(() => {
  jest.restoreAllMocks();
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
