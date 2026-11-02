import { render, screen, waitFor } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import Svg, { Circle } from "react-native-svg";
import type { Scenario } from "../../shared/types/v1/scenario";
import { areaAroundStations } from "../../shared/scenario/affected-stations";
import { getLines } from "../../mockData/data";
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
      <MetroMap scenarioId={scenarioId} />
    </LiveDataContext>
  );
}

const lineButtons = () =>
  ["M1", "M2", "M3", "M4"].filter((name) => screen.queryByText(name));
const viewBox = () => screen.UNSAFE_getByType(Svg).props.viewBox;
const markedDots = () =>
  screen.UNSAFE_queryAllByType(Circle).filter((dot) => dot.props.r === 12);

describe("MetroMap", () => {
  it("shows every line and marks nothing when no scenario is selected", () => {
    render(withScenario(null, async () => scenario));

    expect(lineButtons()).toEqual(["M1", "M2", "M3", "M4"]);
    expect(markedDots()).toHaveLength(0);
    expect(viewBox()).toBe("0 0 950 700");
  });

  it("shows only the covered line, centred, and marks the required station", async () => {
    render(withScenario("TEST-MAP", async () => scenario));

    // The whole network shows while the scenario loads, so wait for the change.
    await waitFor(() => expect(lineButtons()).toEqual(["M1"]));
    expect(markedDots().length).toBeGreaterThan(0);
    // The view fits all of M1, not only the covered stretch ISB–UNI.
    const m1 = getLines().find((line) => line.name === "M1")!;
    expect(viewBox()).toBe(areaAroundStations(m1.connections.flat()));
  });

  it("shows every line when the scenario cannot be loaded", async () => {
    // useScenario logs the failure; silenced so the test output stays clean.
    const logged = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      withScenario("TEST-MAP", () => Promise.reject(new Error("Serverfejl"))),
    );

    await waitFor(() => expect(logged).toHaveBeenCalled());
    expect(lineButtons()).toEqual(["M1", "M2", "M3", "M4"]);
    expect(markedDots()).toHaveLength(0);
    logged.mockRestore();
  });
});
