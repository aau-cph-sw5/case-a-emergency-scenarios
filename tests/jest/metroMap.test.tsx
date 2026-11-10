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
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { areaAroundStations } from "../../shared/scenario/affected-stations";
import { MetroMap } from "../../web/src/components/MetroMap";
import { LiveDataContext } from "../../web/src/data/liveData";

// A synthetic scenario on the map's own station codes: it covers ISB–UNI,
// which only M1 runs through, and needs staff at UNI.
const scenario: Scenario = {
  scenarioId: "TEST-MAP",
  name: "Map test",
  currentVersion: "1",
  covers: [{ trackNumber: 1, stationA: "ISB", stationB: "UNI" }],
  versions: [
    {
      version: "1",
      revision: "Test revision",
      operatingPlan: { name: "Test plan", patterns: [] },
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
  deployments: ScenarioState["deployments"] | null = null,
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
        deployments={deployments === null ? null : { deployments }}
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

  it("starts zoomed out for a scenario and can zoom to its affected stations", () => {
    render(withScenario(scenario.scenarioId, async () => scenario, scenario));
    expect(shownLines()).toEqual(["M1", "M2"]);
    expect(markedDots().length).toBeGreaterThan(0);
    const fullView = viewBox();
    fireEvent.press(screen.getByText("Zoom ind"));
    expect(viewBox()).toBe(areaAroundStations(["ISB", "UNI"], 160));
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
    expect(shownLines()).toEqual(["M3", "M4"]);
    expect(viewBox()).not.toBe(areaAroundStations(["ISB", "UNI"], 160));
    expect(markedDots()).toHaveLength(0);
    expect(screen.UNSAFE_queryAllByType(Path).length).toBeGreaterThan(1);
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
    expect(markedDots()).toHaveLength(0);
  });

  it("shows the default group when a scenario cannot be loaded", async () => {
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      withScenario("TEST-MAP", () => Promise.reject(new Error("Serverfejl"))),
    );
    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(shownLines()).toEqual(["M1", "M2"]);
    expect(markedDots()).toHaveLength(0);
    logged.mockRestore();
  });

  // The map follows the live coverage of the active scenario, like the
  // coverage cards beside it (MET-A-011, #310).
  it("colours a required station by its live coverage", async () => {
    const uniDot = () =>
      screen
        .UNSAFE_queryAllByType(Circle)
        .filter((dot) =>
          [
            colors.statusRed,
            colors.statusYellow,
            colors.statusGreen,
            colors.requiredStation,
          ].includes(dot.props.fill),
        )
        .at(-1)?.props.fill;
    const manned = (count: number) =>
      Array.from({ length: count }, () => ({
        status: "MANNED" as const,
        staff: "1",
        fulfills: "UNI",
      }));

    const view = render(
      withScenario("TEST-MAP", async () => scenario, undefined, undefined, []),
    );
    await waitFor(() => expect(uniDot()).toBe(colors.statusRed));

    view.rerender(
      withScenario(
        "TEST-MAP",
        async () => scenario,
        undefined,
        undefined,
        manned(1),
      ),
    );
    expect(uniDot()).toBe(colors.statusYellow);

    view.rerender(
      withScenario(
        "TEST-MAP",
        async () => scenario,
        undefined,
        undefined,
        manned(2),
      ),
    );
    expect(uniDot()).toBe(colors.statusGreen);
  });
});
