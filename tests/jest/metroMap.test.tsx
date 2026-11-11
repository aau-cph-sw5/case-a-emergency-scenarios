import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { colors, lineColors } from "../../shared/Theme";
import type { Scenario } from "../../shared/types/v1/scenario";
import { areaAroundStations } from "../../shared/scenario/affected-stations";
import { MetroMap } from "../../web/src/components/MetroMap";
import { LiveDataContext } from "../../web/src/data/liveData";

// A synthetic scenario on the map's own station codes: it covers ISB–UNI,
// which only M1 runs through, and needs staff at UNI.
const scenario: Scenario = {
  scenarioId: "TEST-MAP",
  name: "Map test",
  lineGroup: "M1_M2",
  currentVersion: "1",
  covers: [{ trackNumber: 1, stationA: "ISB", stationB: "UNI" }],
  versions: [
    {
      version: "1",
      revision: "Test revision",
      operatingPlan: {
        name: "Test plan",
        patterns: [
          {
            operationType: "PENDULUM",
            routeCode: "VAN-VEA",
            trackNumber: 1,
            maximumTrains: 1,
            did: "TEST",
            route: [
              { sequence: 1, station: "VAN" },
              { sequence: 2, station: "FL" },
              { sequence: 3, station: "LIT" },
              { sequence: 4, station: "SOT" },
              { sequence: 5, station: "FB" },
              { sequence: 6, station: "FOR" },
              { sequence: 7, station: "KN" },
              { sequence: 8, station: "KGN" },
              { sequence: 9, station: "KHC" },
              { sequence: 10, station: "ISB" },
              { sequence: 11, station: "UNI" },
              { sequence: 12, station: "KHS" },
              { sequence: 13, station: "BC" },
              { sequence: 14, station: "ØRE" },
              { sequence: 15, station: "VEA" },
            ],
          },
          {
            operationType: "ROUNDTRIP",
            routeCode: "FB-CPH",
            trackNumber: 12,
            maximumTrains: 1,
            did: "TEST-2",
            route: [
              { sequence: 1, station: "FB" },
              { sequence: 2, station: "FOR" },
              { sequence: 3, station: "KN" },
              { sequence: 4, station: "KGN" },
              { sequence: 5, station: "KHC" },
              { sequence: 6, station: "AMB" },
              { sequence: 7, station: "LGP" },
              { sequence: 8, station: "ØSV" },
              { sequence: 9, station: "AMS" },
              { sequence: 10, station: "FEØ" },
              { sequence: 11, station: "KSA" },
              { sequence: 12, station: "CPH" },
            ],
          },
        ],
      },
      stationRequirements: [
        { station: "UNI", placement: "Platform", minimumStaffing: 2 },
      ],
    },
  ],
};

// The data layer as LiveDataProvider would hand it out, without a server.
function withScenario(
  scenarioId: string | null,
  loadScenario: () => Promise<Scenario>,
  preview?: Scenario | null,
  lineGroup?: "M1/M2" | "M3/M4",
) {
  const value = {
    live: {
      activations: [],
      scenarios: [],
      isConnected: true,
      isLoading: false,
      lastUpdatedAt: null,
      error: null,
      scenariosError: null,
      reloadScenarios: () => {},
    },
    loadScenario,
  };
  return (
    <LiveDataContext value={value}>
      <MetroMap
        scenarioId={scenarioId}
        scenario={preview}
        lineGroup={lineGroup}
      />
    </LiveDataContext>
  );
}

// The lines actually drawn, told apart by their colour.
const shownLines = () => {
  const strokes = [
    ...screen.UNSAFE_queryAllByType(Line),
    ...screen.UNSAFE_queryAllByType(Path),
  ].map((strip) => strip.props.stroke);
  return ["M1", "M2", "M3", "M4"].filter((_, index) =>
    strokes.includes(lineColors[index]),
  );
};
const viewBox = () => screen.UNSAFE_getByType(Svg).props.viewBox;
const markedDots = () =>
  screen
    .UNSAFE_queryAllByType(Circle)
    .filter((dot) => dot.props.fill === colors.requiredStation);

describe("MetroMap", () => {
  it("starts with the M1/M2 network fitted to the map", () => {
    render(withScenario(null, async () => scenario));
    expect(shownLines()).toEqual(["M1", "M2"]);
    expect(markedDots()).toHaveLength(0);
    expect(viewBox()).not.toBe("0 0 950 700");
    expect(screen.queryByText("M1")).toBeNull();
  });

  it("draws the complete scenario route and can zoom to it", () => {
    render(withScenario(scenario.scenarioId, async () => scenario, scenario));
    expect(shownLines()).toEqual(["M1", "M2"]);
    expect(screen.UNSAFE_queryAllByType(Line)).toHaveLength(100);
    expect(screen.getByText("TEST")).toBeTruthy();
    expect(screen.getByText("TEST-2")).toBeTruthy();
    const strokes = screen
      .UNSAFE_queryAllByType(Line)
      .map((segment) => segment.props.stroke);
    expect(strokes).toContain(lineColors[0]);
    expect(strokes).toContain(lineColors[1]);
    expect(markedDots().length).toBeGreaterThan(0);
    const fullView = viewBox();
    fireEvent.press(screen.getByText("Zoom ind"));
    expect(viewBox()).toBe(
      areaAroundStations(
        [
          "VAN",
          "FL",
          "LIT",
          "SOT",
          "FB",
          "FOR",
          "KN",
          "KGN",
          "KHC",
          "AMB",
          "LGP",
          "ØSV",
          "AMS",
          "FEØ",
          "KSA",
          "CPH",
          "ISB",
          "UNI",
          "KHS",
          "BC",
          "ØRE",
          "VEA",
        ],
        160,
      ),
    );
    fireEvent.press(screen.getByText("Zoom ud"));
    expect(viewBox()).toBe(fullView);
  });

  it("switches to the M3/M4 group with a centered view and separate tracks", () => {
    const view = render(
      withScenario(
        scenario.scenarioId,
        async () => scenario,
        scenario,
        "M1/M2",
      ),
    );
    fireEvent.press(screen.getByText("Zoom ind"));
    view.rerender(
      withScenario(
        scenario.scenarioId,
        async () => scenario,
        scenario,
        "M3/M4",
      ),
    );
    expect(shownLines()).toEqual([]);
    expect(viewBox()).not.toBe(areaAroundStations(["ISB", "UNI"], 160));
    expect(markedDots()).toHaveLength(0);
    expect(screen.UNSAFE_queryAllByType(Path)).toHaveLength(0);
    view.rerender(
      withScenario(
        scenario.scenarioId,
        async () => scenario,
        scenario,
        "M1/M2",
      ),
    );
    expect(screen.getByText("Zoom ud")).toBeTruthy();
  });

  it("shows blocked track and the required staffing count", () => {
    render(withScenario(scenario.scenarioId, async () => scenario, scenario));
    const blocked = screen
      .UNSAFE_queryAllByType(Line)
      .filter((strip) => strip.props.strokeDasharray !== undefined);
    expect(blocked).toHaveLength(2);
    expect(blocked[0].props.stroke).toBe(colors.blockedTrack);
    expect(markedDots().some((dot) => dot.props.stroke === colors.text)).toBe(
      true,
    );
    expect(
      screen
        .UNSAFE_queryAllByType(SvgText)
        .some((label) => label.props.children === 2),
    ).toBe(true);
  });

  it("uses the preview without fetching, and clears markers when it is removed", () => {
    const loadScenario = jest.fn<() => Promise<Scenario>>();
    const view = render(
      withScenario(scenario.scenarioId, loadScenario, scenario),
    );
    expect(loadScenario).not.toHaveBeenCalled();
    expect(markedDots().length).toBeGreaterThan(0);
    view.rerender(withScenario(scenario.scenarioId, loadScenario, null));
    expect(shownLines()).toEqual([]);
    expect(markedDots()).toHaveLength(0);
  });

  it("does not show the mock network while a selected scenario fails to load", async () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      withScenario("TEST-MAP", () => Promise.reject(new Error("Serverfejl"))),
    );
    expect(shownLines()).toEqual([]);
    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(shownLines()).toEqual([]);
    expect(markedDots()).toHaveLength(0);
    logged.mockRestore();
  });
});
