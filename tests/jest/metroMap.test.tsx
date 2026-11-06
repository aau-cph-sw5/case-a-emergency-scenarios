import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import Svg, { Circle, Line, Text as SvgText } from "react-native-svg";
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
  const strokes = screen
    .UNSAFE_queryAllByType(Line)
    .map((strip) => strip.props.stroke);
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
  it("switches line groups without retaining a zoom into the other group", () => {
    const view = render(
      withScenario("TEST-MAP", async () => scenario, scenario, "M1/M2"),
    );
    expect(shownLines()).toEqual(["M1", "M2"]);
    fireEvent.press(screen.getByText("Zoom ind"));
    expect(viewBox()).toBe(areaAroundStations(["ISB", "UNI"], 160));
    expect(screen.queryByText("M1")).toBeNull();
    view.rerender(
      withScenario("TEST-MAP", async () => scenario, scenario, "M3/M4"),
    );
    expect(shownLines()).toEqual(["M3", "M4"]);
    expect(viewBox()).not.toBe(areaAroundStations(["ISB", "UNI"], 160));
    expect(markedDots()).toHaveLength(0);
  });
  it("shows every line and marks nothing when no scenario is selected", () => {
    render(withScenario(null, async () => scenario));

    expect(shownLines()).toEqual(["M1", "M2", "M3", "M4"]);
    expect(markedDots()).toHaveLength(0);
    expect(viewBox()).toBe("0 0 950 700");
  });

  it("shows the covered line at full extent and marks the required station", async () => {
    render(withScenario("TEST-MAP", async () => scenario));

    // The whole network shows while the scenario loads, so wait for the change.
    await waitFor(() => expect(shownLines()).toEqual(["M1"]));
    expect(markedDots().length).toBeGreaterThan(0);
    expect(viewBox()).toBe("0 0 950 700");
  });

  it("keeps a required station on another line inside the view", async () => {
    // CPH is only on M2, so fitting the covered stretch would leave it out.
    const [version] = scenario.versions;
    const offLine: Scenario = {
      ...scenario,
      versions: [
        {
          ...version,
          stationRequirements: [
            ...version.stationRequirements,
            { station: "CPH", placement: "Platform", minimumStaffing: 1 },
          ],
        },
      ],
    };
    render(withScenario("TEST-MAP", async () => offLine));

    await waitFor(() => expect(shownLines()).toEqual(["M1"]));
    fireEvent.press(screen.getByText("Zoom ind"));
    expect(viewBox()).toBe(areaAroundStations(["ISB", "UNI", "CPH"], 160));
  });

  it("draws the blocked track dashed and the required station orange", async () => {
    render(withScenario("TEST-MAP", async () => scenario));
    await waitFor(() => expect(shownLines()).toEqual(["M1"]));

    const blocked = screen
      .UNSAFE_queryAllByType(Line)
      .filter((strip) => strip.props.strokeDasharray !== undefined);
    // One piece on one of the two tracks, which is drawn as two strips.
    expect(blocked).toHaveLength(2);
    expect(blocked[0].props.stroke).toBe(colors.blockedTrack);
    expect(markedDots().length).toBeGreaterThan(0);
    expect(markedDots()[0].props.stroke).toBe(colors.text);
    expect(
      screen
        .UNSAFE_queryAllByType(SvgText)
        .some((label) => label.props.children === 2),
    ).toBe(true);
  });

  it("uses the preview's current requirements without fetching another result", () => {
    const loadScenario = jest.fn<() => Promise<Scenario>>();
    const view = render(
      withScenario(scenario.scenarioId, loadScenario, scenario),
    );
    const counts = () =>
      screen
        .UNSAFE_queryAllByType(SvgText)
        .map((label) => label.props.children);
    expect(counts()).toContain(2);
    expect(loadScenario).not.toHaveBeenCalled();
    view.rerender(withScenario(scenario.scenarioId, loadScenario, null));
    expect(markedDots()).toHaveLength(0);
    expect(counts()).not.toContain(2);
  });

  it("zooms in and back out, keeping the marked station", async () => {
    render(withScenario("TEST-MAP", async () => scenario));
    await waitFor(() => expect(shownLines()).toEqual(["M1"]));

    fireEvent.press(screen.getByText("Zoom ind"));
    expect(shownLines()).toEqual(["M1"]);
    expect(viewBox()).toBe(areaAroundStations(["ISB", "UNI"], 160));
    expect(markedDots().length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText("Vis hele kortet"));
    expect(shownLines()).toEqual(["M1"]);
    expect(viewBox()).toBe("0 0 950 700");
  });

  it("shows another line only when its button is toggled on", async () => {
    render(withScenario("TEST-MAP", async () => scenario));
    await waitFor(() => expect(shownLines()).toEqual(["M1"]));

    fireEvent.press(screen.getByText("M2"));
    expect(shownLines()).toEqual(["M1", "M2"]);

    // The choice survives zooming in.
    fireEvent.press(screen.getByText("Zoom ind"));
    expect(shownLines()).toEqual(["M1", "M2"]);
  });

  it("offers no zoom button when the full map already shows", () => {
    render(withScenario(null, async () => scenario));

    expect(screen.queryByText("Vis hele kortet")).toBeNull();
  });

  it("zooms out again when another scenario is selected", async () => {
    const view = render(withScenario("TEST-MAP", async () => scenario));
    await waitFor(() => expect(shownLines()).toEqual(["M1"]));
    fireEvent.press(screen.getByText("Zoom ind"));

    view.rerender(
      withScenario("OTHER", async () => ({
        ...scenario,
        scenarioId: "OTHER",
      })),
    );

    await waitFor(() => expect(shownLines()).toEqual(["M1"]));
    expect(viewBox()).toBe("0 0 950 700");
  });

  it("shows every line when the scenario cannot be loaded", async () => {
    // useScenario logs the failure; silenced so the test output stays clean.
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      withScenario("TEST-MAP", () => Promise.reject(new Error("Serverfejl"))),
    );

    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(shownLines()).toEqual(["M1", "M2", "M3", "M4"]);
    expect(markedDots()).toHaveLength(0);
    logged.mockRestore();
  });
});
