import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import {
  oneRowPerStation,
  ScenarioOverview,
} from "../../mobile/src/screens/ScenarioOverview";
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

describe("ScenarioOverview stations (MET-A-015, #263, #376)", () => {
  it("selects the tapped station while the steward has none (#376)", () => {
    const onSelect = jest.fn();
    render(<ScenarioOverview snapshot={snapshot} onSelect={onSelect} />);
    expect(screen.getByText("Vælg nærmeste station")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Vælg Station B"));
    expect(onSelect).toHaveBeenCalledWith("Station B");
  });

  it("marks the selected station", () => {
    render(
      <ScenarioOverview
        snapshot={snapshot}
        onSelect={jest.fn()}
        selected="Station B"
      />,
    );
    expect(screen.getByLabelText("Vælg Station B")).toBeSelected();
  });

  it("offers no selection when the steward cannot choose a station", () => {
    render(<ScenarioOverview snapshot={snapshot} />);
    expect(screen.queryByLabelText("Vælg Station B")).toBeNull();
    expect(screen.getByText("Påvirkede stationer")).toBeTruthy();
  });

  // After check in (#377): the map, then the tasks in the same frame; the
  // other stations only when opened, and then the tasks close to their strip.
  it("shows the tasks under the map after check in, the stations on request", () => {
    const onToggleRest = jest.fn();
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        ownArrived
        onToggleRest={onToggleRest}
      />,
    );
    expect(screen.getByText("Opgaver på Station B")).toBeTruthy();
    expect(screen.queryByText("0/1")).toBeNull();
    fireEvent.press(screen.getByText("Vis alle 1"));
    expect(onToggleRest).toHaveBeenCalledTimes(1);
    screen.unmount();
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        ownArrived
        restOpen
        onToggleRest={onToggleRest}
      />,
    );
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(screen.getByText("Vis færre")).toBeTruthy();
    fireEvent.press(screen.getByText("Vis opgaver"));
    expect(onToggleRest).toHaveBeenCalledTimes(2);
  });

  it("shows the tasks only after check in", () => {
    render(
      <ScenarioOverview snapshot={snapshot} assignedStation="Station B" />,
    );
    expect(screen.queryByText("Opgaver på Station B")).toBeNull();
    screen.unmount();
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        ownArrived
      />,
    );
    expect(screen.getByText("Opgaver på Station B")).toBeTruthy();
  });

  // The map in a 21:9 frame; the strip collapses it and brings it back.
  it("collapses and brings back the map with the strip", () => {
    const onToggleMap = jest.fn();
    render(<ScenarioOverview snapshot={snapshot} onToggleMap={onToggleMap} />);
    fireEvent.press(screen.getByText("Vis alle 1"));
    expect(onToggleMap).toHaveBeenCalledTimes(1);
    screen.unmount();
    render(<ScenarioOverview snapshot={snapshot} mapShown={false} />);
    expect(screen.getByText("Vis kort")).toBeTruthy();
  });

  // While on the way the own row is swiped or tapped to cancel; only
  // BEKRÆFT ANNULLÉR cancels, BEHOLD closes the row again.
  it("cancels from the own row only after BEKRÆFT ANNULLÉR", () => {
    const onCancel = jest.fn();
    render(
      <ScenarioOverview
        snapshot={snapshot}
        assignedStation="Station B"
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText("‹‹ Swipe for at annullere")).toBeTruthy();
    expect(screen.queryByText("BEKRÆFT ANNULLÉR")).toBeNull();
    fireEvent.press(screen.getByLabelText("Annullér Station B"));
    fireEvent.press(screen.getByText("BEHOLD"));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Annullér Station B"));
    fireEvent.press(screen.getByText("BEKRÆFT ANNULLÉR"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // A station with two requirement rows is listed once, needing both (#376).
  it("lists a station once, also when it has several requirement rows", () => {
    const base = (scenario as Scenario).versions[0];
    const row = base.stationRequirements![0];
    const twoRows = buildSnapshot(
      {
        active: true,
        state: { ...(activeState as ScenarioState), deployments: [] },
        scenario: {
          ...(scenario as Scenario),
          versions: [
            {
              ...base,
              stationRequirements: [
                row,
                { ...row, placement: "Second placement" },
              ],
            },
          ],
        },
      },
      "9",
      new Date(),
    );
    render(<ScenarioOverview snapshot={twoRows} onSelect={jest.fn()} />);
    expect(screen.getAllByLabelText("Vælg Station B")).toHaveLength(1);
    expect(screen.getByText("Vis alle 1")).toBeTruthy();
    expect(screen.getByText(`0/${row.minimumStaffing * 2}`)).toBeTruthy();
  });

  // The tasks come from every requirement row of the station (#377).
  it("lists the tasks of all the station's rows, numbered from 1", () => {
    const base = (scenario as Scenario).versions[0];
    const row = base.stationRequirements![0];
    const twoRows = buildSnapshot(
      {
        active: true,
        state: activeState as ScenarioState,
        scenario: {
          ...(scenario as Scenario),
          versions: [
            {
              ...base,
              stationRequirements: [
                { ...row, actions: [{ sequence: 1, instruction: "First" }] },
                {
                  ...row,
                  placement: "Second placement",
                  actions: [{ sequence: 1, instruction: "Second" }],
                },
              ],
            },
          ],
        },
      },
      "9",
      new Date(),
    );
    render(
      <ScenarioOverview
        snapshot={twoRows}
        assignedStation="Station B"
        ownArrived
      />,
    );
    expect(screen.getByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("2.")).toBeTruthy();
  });

  it("merges rows in the order each station first appears", () => {
    const row = (scenario as Scenario).versions[0].stationRequirements![0];
    const merged = oneRowPerStation([
      { ...row, station: "A", minimumStaffing: 1 },
      { ...row, station: "B", minimumStaffing: 1 },
      { ...row, station: "A", minimumStaffing: 2 },
    ]);
    expect(merged.map((r) => [r.station, r.minimumStaffing])).toEqual([
      ["A", 3],
      ["B", 1],
    ]);
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
        restOpen
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

    it("says the steward checked out from the station, which can be chosen again", () => {
      render(<ScenarioOverview snapshot={checkedOut} onSelect={jest.fn()} />);
      expect(screen.getByText("Tjekket ud herfra")).toBeTruthy();
      expect(screen.getByLabelText("Vælg Station B")).toBeTruthy();
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
          onSelect={jest.fn()}
          checkedOutStation="Station B"
        />,
      );
      expect(screen.getByText("Tjekket ud herfra")).toBeTruthy();
    });
  });
});
