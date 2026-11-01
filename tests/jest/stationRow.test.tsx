import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import StationRow, {
  type StationRequirement,
} from "../../shared/components/stationRow";
import type { ActiveDeployments } from "../../shared/components/stationState";

const requirement: StationRequirement = {
  station: "Station A",
  placement: "Platform 1, near the elevators",
  minimumStaffing: 2,
  actions: [
    { sequence: 1, instruction: "Meet passengers at the platform." },
    { sequence: 2, instruction: "Direct passengers to the exit." },
  ],
};

function deployments(
  ...statuses: ActiveDeployments["deployments"][number]["status"][]
): ActiveDeployments {
  return {
    deployments: statuses.map((status) => ({ fulfills: "Station A", status })),
  };
}

describe("StationRow", () => {
  it("shows arrived against needed, who is on the way and who is missing", () => {
    render(
      <StationRow
        requirement={requirement}
        deployments={deployments("MANNED", "PENDING")}
      />,
    );

    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByText("1 på stationen")).toBeTruthy();
    expect(screen.getByText("1 på vej")).toBeTruthy();
    expect(screen.getByText("Mangler 1 steward")).toBeTruthy();
    expect(screen.queryByText("Platform 1, near the elevators")).toBeNull();
  });

  it("says the station is fully staffed when everyone has arrived", () => {
    render(
      <StationRow
        requirement={requirement}
        deployments={deployments("MANNED", "MANNED")}
      />,
    );

    expect(screen.getByText("2/2")).toBeTruthy();
    expect(screen.getByText("Fuldt bemandet")).toBeTruthy();
  });

  it("expands to show the placement and the ordered actions", () => {
    render(
      <StationRow requirement={requirement} deployments={deployments()} />,
    );

    fireEvent.press(screen.getByText("Station A"));

    expect(screen.getByText("Platform 1, near the elevators")).toBeTruthy();
    expect(
      screen.getByText("1. Meet passengers at the platform."),
    ).toBeTruthy();
    expect(screen.getByText("2. Direct passengers to the exit.")).toBeTruthy();

    fireEvent.press(screen.getByText("Station A"));
    expect(screen.queryByText("Platform 1, near the elevators")).toBeNull();
  });

  it("never counts an unknown status as arrived", () => {
    render(
      <StationRow
        requirement={{ ...requirement, minimumStaffing: 1 }}
        deployments={deployments(
          "BROKEN" as ActiveDeployments["deployments"][number]["status"],
        )}
      />,
    );

    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.getByText("Mangler 1 steward")).toBeTruthy();
  });
});
