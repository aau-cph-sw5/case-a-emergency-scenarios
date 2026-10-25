import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import StatusBar, { formatDuration } from "../../shared/components/statusBar";
import StationRow from "../../shared/components/stationRow";
import { countByStatus } from "../../shared/components/stationState";
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
    screen.getByText("Activated by operator-001 · Active for 00:42:10");
    screen.getByText("0 af 3"); // stations covered
    screen.getByText("⚠ 3 with gaps");
    screen.getByText("1 af 4"); // stewards manned out of all positions
    screen.getByText("✓ 1 manned · ➜ 1 pending · ✕ 2 unmanned");
    screen.getByText(/^● Live · updated/);
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
    screen.getByText("✓ All covered");
    expect(screen.queryByText(/with gaps/)).toBeNull();
  });
  it("shows 'No active scenario' but keeps the connection state", () => {
    render(
      <StatusBar
        state={null}
        requirements={[]}
        isConnected
        lastUpdate={null}
        now={now}
      />,
    );

    screen.getByText("No active scenario");
    screen.getByText("● Live · updated --:--");
    expect(screen.queryByText(/Active for/)).toBeNull();
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

    screen.getByText("No active scenario");
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

    screen.getByText("⚠ Disconnected · data may be out of date");
    expect(screen.queryByText(/Live/)).toBeNull();
  });
  it("counts the same statuses the station rows show", () => {
    const state = createState();
    const counts = countByStatus(state, requirements);

    // Render every row in one tree, like the station list does.
    render(
      <>
        {requirements.map((requirement) => (
          <StationRow
            key={requirement.station}
            requirement={{ ...requirement, placement: "Platform" }}
            deployments={state}
          />
        ))}
      </>,
    );

    // The rows draw one symbol per position: ✓ manned, ➜ pending, ✕ unmanned.
    expect(screen.getAllByText("✓")).toHaveLength(counts.MANNED);
    expect(screen.getAllByText("➜")).toHaveLength(counts.PENDING);
    expect(screen.getAllByText("✕")).toHaveLength(counts.UNMANNED);
  });
});
