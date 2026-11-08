import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScenarioOverview } from "../../mobile/src/screens/ScenarioOverview";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

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
    expect(screen.getByText("0 / 1")).toBeTruthy();
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
