import { act, render, screen } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactElement } from "react";
import { isStale, STALE_AFTER_MS } from "../../shared/components/stationState";
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

function manned(staff: string | number, station: string, reportedAt: string) {
  // The server sends a numeric userId today, although the type says string.
  return {
    status: "MANNED",
    staff,
    fulfills: station,
    reportedAt,
  } as Deployment;
}

// Renders a component with live data given directly instead of a server.
function renderWithLive(ui: ReactElement, live: Partial<LiveData>) {
  const value = {
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
  return render(<LiveDataContext value={value}>{ui}</LiveDataContext>);
}

afterEach(() => {
  jest.useRealTimers();
});

describe("isStale", () => {
  it("is fresh up to the threshold and stale after it", () => {
    expect(isStale(new Date(NOW - STALE_AFTER_MS).toISOString(), NOW)).toBe(
      false,
    );
    expect(isStale(new Date(NOW - STALE_AFTER_MS - 1).toISOString(), NOW)).toBe(
      true,
    );
  });

  it("treats a missing or unreadable report as stale", () => {
    expect(isStale(undefined, NOW)).toBe(true);
    expect(isStale(null, NOW)).toBe(true);
    expect(isStale("not-a-timestamp", NOW)).toBe(true);
  });
});

describe("formatAge", () => {
  it("shows minutes, then hours and minutes", () => {
    expect(formatAge(minutesAgo(0), NOW)).toBe("lige nu");
    expect(formatAge(minutesAgo(2), NOW)).toBe("for 2 min siden");
    expect(formatAge(minutesAgo(65), NOW)).toBe("for 1 t 5 min siden");
  });

  it("shows a missing report and a report from the future sensibly", () => {
    expect(formatAge(null, NOW)).toBe("ingen rapport");
    expect(formatAge(new Date(NOW + 60_000).toISOString(), NOW)).toBe(
      "lige nu",
    );
  });
});

describe("stewardPositions", () => {
  it("lists every staffed deployment across activations, by station then staff", () => {
    const positions = stewardPositions([
      activation("ACT-1", [
        manned("steward-002", "Nørreport", minutesAgo(2)),
        { status: "UNMANNED", staff: null, fulfills: "Kongens Nytorv" },
      ]),
      activation("ACT-2", [manned(7, "Flintholm", minutesAgo(1))]),
    ]);

    expect(positions).toEqual([
      { staff: "7", station: "Flintholm", reportedAt: minutesAgo(1) },
      { staff: "steward-002", station: "Nørreport", reportedAt: minutesAgo(2) },
    ]);
  });
});

describe("StewardPositions", () => {
  it("shows each steward with station and report age, and marks stale ones in text", () => {
    jest.useFakeTimers({ now: NOW });
    renderWithLive(<StewardPositions />, {
      activations: [
        activation("ACT-1", [
          manned("steward-002", "Nørreport", minutesAgo(2)),
          manned("steward-003", "Vanløse", minutesAgo(20)),
        ]),
      ],
    });

    expect(
      screen.getByText("✓ · steward-002 · Nørreport · for 2 min siden"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "⚠ · steward-003 · Vanløse · for 20 min siden · forældet",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ages the rows without a new report and turns them stale", () => {
    jest.useFakeTimers({ now: NOW });
    renderWithLive(<StewardPositions />, {
      activations: [
        activation("ACT-1", [
          manned("steward-002", "Nørreport", minutesAgo(4)),
        ]),
      ],
    });
    expect(
      screen.getByText("✓ · steward-002 · Nørreport · for 4 min siden"),
    ).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2 * 60_000);
    });

    expect(
      screen.getByText(
        "⚠ · steward-002 · Nørreport · for 6 min siden · forældet",
      ),
    ).toBeTruthy();
  });

  it("says positions may be out of date while disconnected", () => {
    renderWithLive(<StewardPositions />, { isConnected: false });

    expect(
      screen.getByText(
        "Ingen forbindelse til serveren. Positionerne kan være forældede.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Ingen positioner endnu.")).toBeTruthy();
  });
});
