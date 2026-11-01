import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import StatusBar, { formatDuration } from "../../shared/components/statusBar";
import ScenarioStationList from "../../shared/components/stationView";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

// Station A needs 2 stewards, B and C need 1 each: 4 positions in total.
const requirements = [
  { station: "Station A", minimumStaffing: 2 },
  { station: "Station B", minimumStaffing: 1 },
  { station: "Station C", minimumStaffing: 1 },
];

function createState(overrides: Partial<ScenarioState> = {}): ScenarioState {
  return {
    activationId: "ACT-TEST-001",
    scenarioId: "TEST-001",
    startedAt: "2026-10-22T10:00:00Z",
    endedAt: null,
    status: "ACTIVE",
    actor: "operator-001",
    sequence: 1,
    deployments: [
      { fulfills: "Station A", status: "MANNED" },
      { fulfills: "Station B", status: "PENDING" },
    ],
    ...overrides,
  };
}

// 42 minutes and 10 seconds after startedAt.
const now = new Date("2026-10-22T10:42:10Z");

describe("formatDuration", () => {
  it("formats elapsed time as HH:MM:SS", () => {
    expect(formatDuration("2026-10-22T10:00:00Z", now)).toBe("00:42:10");
  });

  it("shows 00:00:00 when the start time is ahead of the clock", () => {
    expect(formatDuration("2026-10-22T10:42:15Z", now)).toBe("00:00:00");
  });

  it("falls back for an invalid start time", () => {
    expect(formatDuration("not a date", now)).toBe("--:--:--");
  });
});

describe("StatusBar", () => {
  it("shows all five data points for an active scenario", () => {
    render(
      <StatusBar
        state={createState()}
        scenarioName="Test scenario"
        requirements={requirements}
        isConnected
        lastUpdate="2026-10-22T10:41:00Z"
        now={now}
      />,
    );

    screen.getByText("TEST-001 Test scenario");
    screen.getByText("Aktiveret af operator-001 · Aktiv i 00:42:10");
    screen.getByText("0 af 3"); // stations covered
    screen.getByText("⚠ 3 mangler dækning");
    screen.getByText("1 af 4"); // stewards arrived out of needed
    screen.getByText("1 på vej");
    screen.getByText(/^● Live · opdateret/);
  });

  it("says all covered when every position is manned", () => {
    render(
      <StatusBar
        state={createState({
          deployments: [
            { fulfills: "Station A", status: "MANNED" },
            { fulfills: "Station A", status: "MANNED" },
            { fulfills: "Station B", status: "MANNED" },
            { fulfills: "Station C", status: "MANNED" },
          ],
        })}
        requirements={requirements}
        isConnected
        now={now}
      />,
    );

    screen.getByText("3 af 3");
    screen.getByText("✓ Alle dækket");
    screen.getByText("4 af 4");
    expect(screen.queryByText(/mangler dækning/)).toBeNull();
  });

  it("shows 'Intet aktivt scenarie' but keeps the connection state", () => {
    render(
      <StatusBar
        state={null}
        requirements={[]}
        isConnected
        lastUpdate={null}
        now={now}
      />,
    );

    screen.getByText("Intet aktivt scenarie");
    screen.getByText("● Live · opdateret --:--");
    expect(screen.queryByText(/Aktiv i/)).toBeNull();
  });

  it("treats a closed activation as no active scenario", () => {
    render(
      <StatusBar
        state={createState({ status: "CLOSED" })}
        requirements={requirements}
        isConnected
        now={now}
      />,
    );

    screen.getByText("Intet aktivt scenarie");
  });

  it("says when the socket is disconnected", () => {
    render(
      <StatusBar
        state={createState()}
        requirements={requirements}
        isConnected={false}
        now={now}
      />,
    );

    screen.getByText(
      "⚠ Forbindelsen er afbrudt · informationen kan være forældet",
    );
    expect(screen.queryByText(/Live/)).toBeNull();
  });

  it("shows the same steward numbers as the station list", () => {
    const state = createState();
    const scenario = {
      scenarioId: "TEST-001",
      name: "Test scenario",
      currentVersion: "1",
      versions: [
        {
          version: "1",
          stationRequirements: requirements.map((r) => ({
            ...r,
            placement: "Platform",
          })),
        },
      ],
    } as unknown as Scenario;

    render(
      <>
        <StatusBar
          state={state}
          requirements={requirements}
          isConnected
          now={now}
        />
        <ScenarioStationList scenario={scenario} activeDeployments={state} />
      </>,
    );

    // The bar's "1 af 4" against the list header's "1/4 stewards". The
    // station rows also say "1 på vej", so that text is not unique here.
    screen.getByText("1 af 4");
    screen.getByText("1/4 stewards · 1 på vej");
  });
});
