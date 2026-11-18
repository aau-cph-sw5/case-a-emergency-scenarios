import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScenarioOverview } from "../../mobile/src/screens/ScenarioOverview";
import { Circle } from "react-native-svg";
import { network as networkFixture } from "../helpers/network";
import { buildMapNetwork } from "../../shared/network/network";
import type { Network } from "../../shared/types/v1/network";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { colors, steward } from "../../shared/Theme";

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

describe("ScenarioOverview + per station (MET-A-015, #263)", () => {
  it("draws scenario stations at the provided network positions", () => {
    const network = buildMapNetwork(networkFixture as Network);
    render(
      <ScenarioOverview
        snapshot={snapshot}
        network={network}
        networkIsCached
      />,
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
      <ScenarioOverview
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
      <ScenarioOverview
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
      <ScenarioOverview
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

  it("offers + on each affected station and reports the pressed one", () => {
    const onAssign = jest.fn();
    render(<ScenarioOverview snapshot={snapshot} onAssign={onAssign} />);
    fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    expect(onAssign).toHaveBeenCalledWith("Station B");
  });

  it("offers no + on the station the steward has already reported", () => {
    render(
      <ScenarioOverview
        snapshot={snapshot}
        onAssign={jest.fn()}
        assignedStation="Station B"
      />,
    );
    expect(screen.queryByLabelText("Meld dig på vej til Station B")).toBeNull();
  });

  it("shows the reported station as the steward's own, with its tasks", () => {
    render(
      <ScenarioOverview
        snapshot={snapshot}
        onAssign={jest.fn()}
        assignedStation="Station B"
      />,
    );
    expect(screen.getByText("Opgaver på Station B")).toBeTruthy();
    expect(screen.queryByText("Ingen opgave endnu")).toBeNull();
  });

  it("offers no + when the steward cannot choose a station", () => {
    render(<ScenarioOverview snapshot={snapshot} />);
    expect(screen.queryByLabelText("Meld dig på vej til Station B")).toBeNull();
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
  it("fills the own row in the colour of the steward's status", () => {
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
    expect(screen.getByText("0/1")).toHaveStyle({ color: colors.textInverse });
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

    it("says the steward checked out instead of Din station", () => {
      render(<ScenarioOverview snapshot={checkedOut} onAssign={jest.fn()} />);
      expect(screen.queryByText("Din station")).toBeNull();
      expect(screen.getByText("Tjekket ud herfra")).toBeTruthy();
      expect(screen.getByText("Ingen opgave endnu")).toBeTruthy();
      expect(
        screen.getByLabelText("Meld dig på vej til Station B"),
      ).toBeTruthy();
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
          onAssign={jest.fn()}
          checkedOutStation="Station B"
        />,
      );
      expect(screen.queryByText("Din station")).toBeNull();
      expect(screen.getByText("Tjekket ud herfra")).toBeTruthy();
    });
  });
});
