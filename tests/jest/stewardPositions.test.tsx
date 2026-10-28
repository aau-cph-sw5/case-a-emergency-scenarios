import { fireEvent, render, screen } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import type { ReactElement } from "react";
import { formatTime } from "../../shared/components/stationState";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import {
  StewardPositions,
  stewardPositions,
} from "../../web/src/components/StewardPositions";
import { LiveDataContext, type LiveData } from "../../web/src/data/liveData";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const minutesAgo = (minutes: number) =>
  new Date(NOW - minutes * 60_000).toISOString();

type Deployment = ScenarioState["deployments"][number];

function activation(
  activationId: string,
  deployments: Deployment[],
): ScenarioState {
  return {
    activationId,
    scenarioId: "DEMO-001",
    startedAt: minutesAgo(60),
    status: "ACTIVE",
    actor: "operator-test",
    deployments,
  };
}

function onTheWay(staff: string | number, station: string, reportedAt: string) {
  // The server sends a numeric userId today, although the type says string.
  return {
    status: "PENDING",
    staff,
    fulfills: station,
    reportedAt,
  } as Deployment;
}

function arrived(
  staff: string | number,
  station: string,
  reportedAt: string,
  arrivedAt: string,
) {
  return {
    status: "MANNED",
    staff,
    fulfills: station,
    reportedAt,
    arrivedAt,
  } as Deployment;
}

function liveValue(live: Partial<LiveData>) {
  return {
    live: {
      activations: [],
      scenarios: [],
      isConnected: true,
      isLoading: false,
      lastUpdatedAt: null,
      error: null,
      scenariosError: null,
      ...live,
    },
    loadScenario: jest.fn<() => never>(),
  };
}

// Renders a component with live data given directly instead of a server.
function renderWithLive(ui: ReactElement, live: Partial<LiveData>) {
  return render(
    <LiveDataContext value={liveValue(live)}>{ui}</LiveDataContext>,
  );
}

describe("stewardPositions", () => {
  it("lists staffed deployments across activations, oldest first, with the time that fits the status", () => {
    const positions = stewardPositions([
      activation("ACT-1", [
        arrived("steward-002", "Nørreport", minutesAgo(9), minutesAgo(3)),
        { status: "UNMANNED", staff: null, fulfills: "Kongens Nytorv" },
      ]),
      activation("ACT-2", [onTheWay(7, "Flintholm", minutesAgo(5))]),
    ]);

    expect(positions).toEqual([
      {
        staff: "7",
        station: "Flintholm",
        status: "PENDING",
        time: minutesAgo(5),
      },
      {
        staff: "steward-002",
        station: "Nørreport",
        status: "MANNED",
        time: minutesAgo(3),
      },
    ]);
  });
});

describe("StewardPositions pop-up", () => {
  it("starts closed with the number of stewards on the button", () => {
    renderWithLive(<StewardPositions />, {
      activations: [
        activation("ACT-1", [
          onTheWay("steward-002", "Nørreport", minutesAgo(2)),
        ]),
      ],
    });

    expect(screen.getByText("Status (1)")).toBeTruthy();
    expect(screen.queryByText(/steward-002/)).toBeNull();
  });

  it("opens to one row per steward with status, station and time, and closes again", () => {
    renderWithLive(<StewardPositions />, {
      activations: [
        activation("ACT-1", [
          onTheWay("steward-002", "Nørreport", minutesAgo(2)),
          arrived("steward-003", "Vanløse", minutesAgo(20), minutesAgo(10)),
        ]),
      ],
    });

    fireEvent.press(screen.getByText("Status (2)"));

    expect(screen.getByText("steward-002 | På vej | Nørreport")).toBeTruthy();
    expect(screen.getByText("steward-003 | Ankommet | Vanløse")).toBeTruthy();
    expect(screen.getByText(formatTime(minutesAgo(10)))).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.press(screen.getByLabelText("Luk status"));
    expect(screen.queryByText(/steward-002/)).toBeNull();
  });

  it("updates when a steward moves to another station", () => {
    const view = renderWithLive(<StewardPositions />, {
      activations: [
        activation("ACT-1", [
          onTheWay("steward-002", "Nørreport", minutesAgo(5)),
        ]),
      ],
    });
    fireEvent.press(screen.getByText("Status (1)"));
    expect(screen.getByText("steward-002 | På vej | Nørreport")).toBeTruthy();

    view.rerender(
      <LiveDataContext
        value={liveValue({
          activations: [
            activation("ACT-1", [
              onTheWay("steward-002", "Vanløse", minutesAgo(0)),
            ]),
          ],
        })}
      >
        <StewardPositions />
      </LiveDataContext>,
    );

    expect(screen.getByText("steward-002 | På vej | Vanløse")).toBeTruthy();
    expect(screen.queryByText(/Nørreport/)).toBeNull();
  });

  it("says positions may be out of date while disconnected", () => {
    renderWithLive(<StewardPositions />, { isConnected: false });
    fireEvent.press(screen.getByText("Status (0)"));

    expect(
      screen.getByText(
        "Ingen forbindelse til serveren. Positionerne kan være forældede.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Ingen positioner endnu.")).toBeTruthy();
  });
});
