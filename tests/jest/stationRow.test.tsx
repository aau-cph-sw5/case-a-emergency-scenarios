import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { StyleSheet } from "react-native";
import { Path } from "react-native-svg";
import { colors } from "../../shared/Theme";
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
  it("updates exactly three staffing slots from red to yellow and green, ordered by arrival status", () => {
    const row = (
      ...statuses: ActiveDeployments["deployments"][number]["status"][]
    ) => (
      <StationRow
        requirement={{ ...requirement, minimumStaffing: 3 }}
        deployments={deployments(...statuses)}
        operatorLayout
      />
    );
    const view = render(row());
    expect(screen.getAllByTestId("station-slot-UNMANNED")).toHaveLength(3);
    view.rerender(row("PENDING"));
    expect(screen.getAllByTestId("station-slot-PENDING")).toHaveLength(1);
    expect(screen.getAllByTestId("station-slot-UNMANNED")).toHaveLength(2);
    view.rerender(row("PENDING", "UNMANNED", "MANNED"));
    const slots = screen.getAllByTestId(/^station-slot-/);
    expect(slots.map((slot) => slot.props.testID)).toEqual([
      "station-slot-MANNED",
      "station-slot-PENDING",
      "station-slot-UNMANNED",
    ]);
    expect(
      slots.map((slot) => StyleSheet.flatten(slot.props.style).backgroundColor),
    ).toEqual([colors.background, colors.background, colors.background]);
    expect(
      screen.UNSAFE_getAllByType(Path).map((symbol) => symbol.props.stroke),
    ).toEqual([colors.statusGreen, colors.statusYellowText, colors.statusRed]);
    view.rerender(row("MANNED", "MANNED", "MANNED", "PENDING"));
    expect(screen.getAllByTestId(/^station-slot-/)).toHaveLength(3);
    expect(screen.getAllByTestId("station-slot-MANNED")).toHaveLength(3);
  });

  it("shows only the required number in a compact preview and keeps placement expandable", () => {
    render(<StationRow requirement={requirement} mode="needed-only" compact />);
    expect(
      StyleSheet.flatten(
        screen.getByTestId("preview-station-card").props.style,
      ),
    ).toMatchObject({ backgroundColor: colors.coverageNone });
    expect(screen.getByText("Station A")).toBeTruthy();
    expect(screen.getAllByTestId("station-slot-UNMANNED")).toHaveLength(2);
    expect(
      screen.queryByText(/\d+\/\d+|Minimum|Placering:|Mangler/),
    ).toBeNull();
    fireEvent.press(screen.getByText("Station A"));
    expect(
      screen.getByText("Placering: Platform 1, near the elevators"),
    ).toBeTruthy();
    expect(
      screen.getByText("1. Meet passengers at the platform."),
    ).toBeTruthy();
  });

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
