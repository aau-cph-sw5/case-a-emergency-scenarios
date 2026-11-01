import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import ScenarioStationList from "../../shared/components/stationView";
import type { ActiveDeployments } from "../../shared/components/stationState";
import type { Scenario } from "../../shared/types/v1/scenario";

function createScenario(
  stationNames: string[],
  currentVersion = "1",
): Scenario {
  return {
    scenarioId: "TEST-001",
    name: "Station list test",
    currentVersion,
    versions: [
      {
        version: "1",
        revision: "Test revision",
        operatingPlan: { name: "Test plan", patterns: [] },
        stationRequirements: stationNames.map((station) => ({
          station,
          placement: `${station} platform`,
          minimumStaffing: 1,
        })),
      },
    ],
  };
}

function textContent(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(textContent).join("");
  }
  return "";
}

describe("ScenarioStationList", () => {
  it("shows only current-version requirements and totals in Metro order", () => {
    const scenario = createScenario(["Station C", "Station A"]);
    scenario.versions[0].stationRequirements[0].minimumStaffing = 3;
    scenario.versions.push({
      ...scenario.versions[0],
      version: "old",
      stationRequirements: [
        {
          station: "Old station",
          placement: "Old platform",
          minimumStaffing: 10,
        },
      ],
    });
    render(<ScenarioStationList scenario={scenario} mode="needed-only" />);

    expect(screen.getByText("2 stationer · 4 stewards kræves")).toBeTruthy();
    expect(screen.getByText("Placering: Station C platform")).toBeTruthy();
    expect(screen.getByText("Minimum 3 stewards")).toBeTruthy();
    expect(screen.queryByText("Old station")).toBeNull();
    expect(
      screen.queryByText(/dækket|på vej|på stationen|Mangler|Fuldt bemandet/),
    ).toBeNull();
    expect(
      screen
        .getAllByText(/^Station /)
        .map((element) => textContent(element.props.children)),
    ).toEqual(["Station A", "Station C"]);
  });

  it("shows zero needed and an empty state without live coverage for an empty preview", () => {
    render(
      <ScenarioStationList scenario={createScenario([])} mode="needed-only" />,
    );
    expect(screen.getByText("0 stationer · 0 stewards kræves")).toBeTruthy();
    expect(screen.getByText("Scenariet kræver ingen stationer.")).toBeTruthy();
    expect(screen.queryByText(/dækket|på vej|på stationen/)).toBeNull();
  });

  it("puts the worst covered stations first, in M1 then M2 order when equal, and unknown stations last", () => {
    const scenario = createScenario([
      "Station G",
      "Station C",
      "Station A",
      "Station F",
      "Station B",
      "Station X",
    ]);
    const activeDeployments: ActiveDeployments = {
      deployments: [
        { fulfills: "Station A", status: "MANNED" },
        { fulfills: "Station F", status: "MANNED" },
        { fulfills: "Station G", status: "PENDING" },
      ],
    };

    render(
      <ScenarioStationList
        scenario={scenario}
        activeDeployments={activeDeployments}
      />,
    );

    const stationNames = screen
      .getAllByText(/^Station /)
      .map((element) => textContent(element.props.children));

    expect(stationNames).toEqual([
      "Station B",
      "Station C",
      "Station G",
      "Station X",
      "Station A",
      "Station F",
    ]);
    expect(screen.getByText("6")).toBeTruthy();
    expect(screen.getByText("2/6 stationer dækket")).toBeTruthy();
  });

  it("shows the empty state when the current scenario version is missing", () => {
    render(
      <ScenarioStationList
        scenario={createScenario(["Station A"], "missing")}
        activeDeployments={{ deployments: [] }}
      />,
    );

    expect(screen.getByText("Scenariet kræver ingen stationer.")).toBeTruthy();
  });

  it("shows the empty state when the scenario requires no stations", () => {
    render(
      <ScenarioStationList
        scenario={createScenario([])}
        activeDeployments={{ deployments: [] }}
      />,
    );

    expect(screen.getByText("Scenariet kræver ingen stationer.")).toBeTruthy();
  });

  it("shows the stewards who arrived and who are en route across all stations", () => {
    render(
      <ScenarioStationList
        scenario={createScenario(["Station A", "Station B"])}
        activeDeployments={{
          deployments: [
            { fulfills: "Station A", status: "MANNED" },
            { fulfills: "Station B", status: "PENDING" },
          ],
        }}
      />,
    );

    expect(screen.getByText("1/2 stationer dækket")).toBeTruthy();
    expect(screen.getByText("1/2 stewards · 1 på vej")).toBeTruthy();
  });
});
