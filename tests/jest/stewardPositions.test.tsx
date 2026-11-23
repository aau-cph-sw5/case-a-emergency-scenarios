import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactElement } from "react";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import {
  formatAge,
  StewardPositions,
  stewardPositions,
} from "../../web/src/components/StewardPositions";
import { LiveDataContext, type LiveData } from "../../web/src/data/liveData";

const NOW = Date.parse("2026-10-24T12:00:00Z");
const minutesAgo = (minutes: number) =>
  new Date(NOW - minutes * 60_000).toISOString();

type Deployment = ScenarioState["deployments"][number];

function activation(
  activationId: number,
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

afterEach(() => {
  jest.useRealTimers();
});

describe("formatAge", () => {
  it("shows minutes, then hours and minutes", () => {
    expect(formatAge(minutesAgo(0), NOW)).toBe("lige nu");
    expect(formatAge(minutesAgo(2), NOW)).toBe("for 2 min siden");
    expect(formatAge(minutesAgo(65), NOW)).toBe("for 1 t 5 min siden");
  });

  it("shows a missing time and a time from the future sensibly", () => {
    expect(formatAge(null, NOW)).toBe("ingen rapport");
    expect(formatAge(new Date(NOW + 60_000).toISOString(), NOW)).toBe(
      "lige nu",
    );
  });
});

describe("stewardPositions", () => {
  it("lists staffed deployments across activations, oldest first, with the time that fits the status", () => {
    const positions = stewardPositions([
      activation(1, [
        arrived("steward-002", "Nørreport", minutesAgo(9), minutesAgo(3)),
        { status: "UNMANNED", staff: null, fulfills: "Kongens Nytorv" },
      ]),
      activation(2, [onTheWay(7, "Flintholm", minutesAgo(5))]),
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
  it("keeps its launcher visible and toggles the popup on repeated clicks", () => {
    renderWithLive(<StewardPositions />, {});
    fireEvent.press(screen.getByTestId("status-launcher"));
    expect(screen.getByTestId("status-window")).toBeTruthy();
    expect(screen.queryByText(/Status \(0\)/)).toBeNull();
    expect(
      screen.getByTestId("status-launcher").props.accessibilityState,
    ).toEqual({
      expanded: true,
    });
    fireEvent.press(screen.getByTestId("status-launcher"));
    expect(screen.queryByTestId("status-window")).toBeNull();
    expect(
      screen.getByTestId("status-launcher").props.accessibilityState,
    ).toEqual({
      expanded: false,
    });
  });
  it("starts closed with a notification for an existing report", () => {
    renderWithLive(<StewardPositions />, {
      activations: [
        activation(1, [onTheWay("steward-002", "Nørreport", minutesAgo(2))]),
      ],
    });

    expect(screen.getByLabelText("Status, 1 nye opdateringer")).toBeTruthy();
    expect(screen.queryByText(/steward-002/)).toBeNull();
  });

  it("counts new reports until Status opens and leaves unchanged reports read", () => {
    const first = onTheWay("steward-002", "Nørreport", minutesAgo(2));
    const view = renderWithLive(<StewardPositions />, {
      activations: [activation(1, [first])],
    });
    const launcher = () => screen.getByTestId("status-launcher");
    const update = (...deployments: Deployment[]) =>
      view.rerender(
        <LiveDataContext
          value={liveValue({ activations: [activation(1, deployments)] })}
        >
          <StewardPositions />
        </LiveDataContext>,
      );

    update(first, onTheWay("steward-003", "Vanløse", minutesAgo(1)));
    expect(launcher().props.accessibilityLabel).toBe(
      "Status, 2 nye opdateringer",
    );
    fireEvent.press(launcher());
    expect(launcher().props.accessibilityLabel).toBe("Status");
    fireEvent.press(launcher());
    update(first, onTheWay("steward-003", "Vanløse", minutesAgo(1)));
    expect(launcher().props.accessibilityLabel).toBe("Status");
    update(
      first,
      arrived("steward-003", "Vanløse", minutesAgo(1), minutesAgo(0)),
    );
    expect(launcher().props.accessibilityLabel).toBe(
      "Status, 1 nye opdateringer",
    );
  });

  it("opens to one row per steward with status, station and age, and closes again", () => {
    jest.useFakeTimers({ now: NOW });
    renderWithLive(<StewardPositions />, {
      activations: [
        activation(1, [
          onTheWay("steward-002", "Nørreport", minutesAgo(2)),
          arrived("steward-003", "Vanløse", minutesAgo(20), minutesAgo(10)),
        ]),
      ],
    });

    fireEvent.press(screen.getByTestId("status-launcher"));

    expect(screen.getByText("steward-002 | På vej | Nørreport")).toBeTruthy();
    expect(screen.getByText("steward-003 | ✓ Ankommet | Vanløse")).toBeTruthy();
    expect(screen.getByText("for 2 min siden")).toBeTruthy();
    expect(screen.getByText("for 10 min siden")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.press(screen.getByLabelText("Luk status"));
    expect(screen.queryByText(/steward-002/)).toBeNull();
  });

  it("shows a steward who has finished the task as Opgave udført", () => {
    renderWithLive(<StewardPositions />, {
      activations: [
        activation(1, [
          {
            status: "TASK_DONE",
            staff: "steward-005",
            fulfills: "Forum",
            reportedAt: minutesAgo(4),
          } as Deployment,
        ]),
      ],
    });
    fireEvent.press(screen.getByTestId("status-launcher"));

    expect(
      screen.getByText("steward-005 | ✓✓ Opgave udført | Forum"),
    ).toBeTruthy();
    expect(screen.queryByText(/Ingen status/)).toBeNull();
  });

  it("shows a steward without a status as having none", () => {
    renderWithLive(<StewardPositions />, {
      activations: [
        activation(1, [
          { status: "UNMANNED", staff: "steward-004", fulfills: "Forum" },
        ]),
      ],
    });
    fireEvent.press(screen.getByTestId("status-launcher"));

    expect(screen.getByText("steward-004 | Ingen status | Forum")).toBeTruthy();
  });

  it("counts the age up without a new report", () => {
    jest.useFakeTimers({ now: NOW });
    renderWithLive(<StewardPositions />, {
      activations: [
        activation(1, [onTheWay("steward-002", "Nørreport", minutesAgo(2))]),
      ],
    });
    fireEvent.press(screen.getByTestId("status-launcher"));
    expect(screen.getByText("for 2 min siden")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText("for 3 min siden")).toBeTruthy();
  });

  it("updates when a steward moves to another station", () => {
    const view = renderWithLive(<StewardPositions />, {
      activations: [
        activation(1, [onTheWay("steward-002", "Nørreport", minutesAgo(5))]),
      ],
    });
    fireEvent.press(screen.getByTestId("status-launcher"));
    expect(screen.getByText("steward-002 | På vej | Nørreport")).toBeTruthy();

    view.rerender(
      <LiveDataContext
        value={liveValue({
          activations: [
            activation(1, [onTheWay("steward-002", "Vanløse", minutesAgo(0))]),
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
    fireEvent.press(screen.getByTestId("status-launcher"));

    expect(
      screen.getByText(
        "Ingen forbindelse til serveren. Positionerne kan være forældede.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Ingen positioner endnu.")).toBeTruthy();
  });
});
