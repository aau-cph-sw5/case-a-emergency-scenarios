import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import {
  RETRY_DELAYS_MS,
  StewardView,
  supersededMessage,
} from "../../mobile/src/screens/StewardView";
import { queuePositionReport } from "../../mobile/src/offline/queue-position-report";
import { positionReportDelivery } from "../../mobile/src/offline/position-report-delivery-instance";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("../../mobile/src/socket", () => ({
  socket: { connected: false, on: jest.fn(), off: jest.fn() },
}));
jest.mock("../../shared/socket/useSocketState", () => ({
  useSocketState: () => ({ isConnected: false, messages: [] }),
}));
jest.mock("../../mobile/src/offline/position-report-delivery-instance", () => ({
  positionReportDelivery: { flush: jest.fn() },
}));
jest.mock("../../mobile/src/offline/queue-position-report", () => ({
  queuePositionReport: jest.fn(),
}));
jest.mock("../../shared/offline/use-active-scenario", () => ({
  useActiveScenario: jest.fn(),
}));

const { useActiveScenario } = jest.requireMock(
  "../../shared/offline/use-active-scenario",
) as { useActiveScenario: jest.Mock };
const flush = jest.mocked(positionReportDelivery.flush);
const queue = jest.mocked(queuePositionReport);
const nothingSent = {
  acknowledged: 0,
  rejected: 0,
  pending: 0,
  superseded: [],
};

const queued = {
  id: "report-1",
  userId: "7",
  station: "Station B",
  reportedAt: "2026-11-06T08:00:00Z",
  scenarioId: "DEMO-001",
  activationId: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  flush.mockResolvedValue(nothingSent);
});

// Shows the live view and reports going on the way to Station B.
async function reportStationB() {
  showView({ status: "live", snapshot: noStatus });
  render(stewardView(true));
  await act(async () => {});
  await act(async () => {
    fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
  });
}

const snapshot = buildSnapshot(
  {
    active: true,
    state: activeState as ScenarioState,
    scenario: scenario as Scenario,
  },
  "7",
  new Date("2026-11-06T07:00:00Z"),
);
// Steward 7 without a status, so Station B can be chosen.
const noStatus = buildSnapshot(
  {
    active: true,
    state: {
      ...(activeState as ScenarioState),
      deployments: (activeState as ScenarioState).deployments.filter(
        (deployment) => deployment.staff !== "7",
      ),
    },
    scenario: scenario as Scenario,
  },
  "7",
  new Date("2026-11-06T07:00:00Z"),
);
const payload = Buffer.from(JSON.stringify({ userId: 7 })).toString(
  "base64url",
);
const token = `header.${payload}.signature`;

function showView(view: unknown) {
  useActiveScenario.mockReturnValue({
    view,
    refresh: jest.fn(),
    dismissNotice: jest.fn(),
  });
}

function stewardView(online: boolean) {
  return (
    <StewardView
      token={token}
      online={online}
      onLogout={() => undefined}
      onUnauthorized={() => undefined}
    />
  );
}

describe("StewardView superseded reports", () => {
  it("tells the steward on reconnect, without user action, why a queued report was rejected", async () => {
    flush.mockResolvedValue({
      acknowledged: 0,
      rejected: 1,
      pending: 0,
      superseded: [queued],
    });
    showView({ status: "copy", reason: "offline", snapshot });
    const { rerender } = render(stewardView(false));
    expect(flush).not.toHaveBeenCalled();

    showView({ status: "live", snapshot });
    rerender(stewardView(true));

    expect(
      await screen.findByText(
        "Din position ved Station B blev afvist, fordi scenariet blev stoppet eller skiftet, efter du sendte den.",
      ),
    ).toBeTruthy();
    expect(flush).toHaveBeenCalledWith("7", token);
  });

  it("tells the steward why a queued report was rejected when the scenario was stopped while offline", async () => {
    flush.mockResolvedValue({
      acknowledged: 0,
      rejected: 1,
      pending: 0,
      superseded: [queued],
    });
    showView({ status: "copy", reason: "offline", snapshot });
    const { rerender } = render(stewardView(false));
    expect(flush).not.toHaveBeenCalled();

    // Back online, no scenario is active any more.
    showView({ status: "stood-down", scenarioName: "Demo" });
    rerender(stewardView(true));

    expect(
      await screen.findByText(
        "Din position ved Station B blev afvist, fordi scenariet blev stoppet eller skiftet, efter du sendte den.",
      ),
    ).toBeTruthy();
    expect(flush).toHaveBeenCalledWith("7", token);
  });

  it("queues the chosen station with its activation and sends it", async () => {
    queue.mockResolvedValue(queued);
    flush.mockResolvedValueOnce(nothingSent);
    flush.mockResolvedValueOnce({ ...nothingSent, acknowledged: 1 });

    await reportStationB();

    expect(queue).toHaveBeenCalledWith({
      userId: "7",
      station: "Station B",
      scenarioId: noStatus.state.scenarioId,
      activationId: noStatus.state.activationId,
      event: "EN_ROUTE",
    });
    expect(screen.getByText("Position sendt.")).toBeTruthy();
  });

  it("says a refused report was not received and others are waiting", async () => {
    queue.mockResolvedValue(queued);
    flush.mockResolvedValueOnce(nothingSent);
    flush.mockResolvedValueOnce({ ...nothingSent, rejected: 1, pending: 1 });

    await reportStationB();

    expect(
      screen.getByText(
        "Positionen blev ikke modtaget.\nPosition gemt. Afventer levering.",
      ),
    ).toBeTruthy();
  });

  it("fetches the server's status when a report was refused", async () => {
    queue.mockResolvedValue(queued);
    flush.mockResolvedValueOnce(nothingSent);
    flush.mockResolvedValueOnce({ ...nothingSent, rejected: 1 });

    await reportStationB();

    const { refresh } = useActiveScenario.mock.results[0].value as {
      refresh: jest.Mock;
    };
    expect(screen.getByText("Positionen blev ikke modtaget.")).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("keeps the report on the phone when it cannot be sent", async () => {
    queue.mockResolvedValue(queued);
    flush.mockResolvedValueOnce(nothingSent);
    flush.mockRejectedValueOnce(new Error("offline"));

    await reportStationB();

    expect(
      screen.getByText(
        "Position gemt på telefonen, men kunne ikke sendes endnu.",
      ),
    ).toBeTruthy();
  });

  it("says so when the report cannot be saved on the phone", async () => {
    queue.mockRejectedValue(new Error("storage full"));

    await reportStationB();

    expect(
      screen.getByText("Positionen kunne ikke gemmes på telefonen."),
    ).toBeTruthy();
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("names every station when several reports were rejected", () => {
    expect(supersededMessage([])).toBeNull();
    expect(
      supersededMessage([
        queued,
        { ...queued, id: "report-2", station: "Station C" },
      ]),
    ).toBe(
      "2 positioner (Station B, Station C) blev afvist, fordi scenariet blev stoppet eller skiftet, efter du sendte dem.",
    );
  });

  it("tries again while live when a send fails, without user action", async () => {
    jest.useFakeTimers();
    try {
      const blocked = {
        ...nothingSent,
        pending: 1,
        blockedBy: { status: "retry" as const },
      };
      flush.mockResolvedValueOnce(blocked);
      flush.mockResolvedValueOnce(blocked);
      flush.mockResolvedValueOnce({ ...nothingSent, acknowledged: 1 });
      showView({ status: "live", snapshot });
      render(stewardView(true));
      await act(async () => {});
      expect(flush).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(RETRY_DELAYS_MS[0]);
      });
      expect(flush).toHaveBeenCalledTimes(2);

      // The second try waits longer than the first.
      await act(async () => {
        jest.advanceTimersByTime(RETRY_DELAYS_MS[0]);
      });
      expect(flush).toHaveBeenCalledTimes(2);
      await act(async () => {
        jest.advanceTimersByTime(RETRY_DELAYS_MS[1] - RETRY_DELAYS_MS[0]);
      });
      expect(flush).toHaveBeenCalledTimes(3);
      expect(screen.getByText("Position sendt.")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
  it("tries a report again later when it could not be sent at once", async () => {
    jest.useFakeTimers();
    try {
      queue.mockResolvedValue(queued);
      flush.mockResolvedValueOnce(nothingSent);
      flush.mockRejectedValueOnce(new Error("offline"));
      flush.mockResolvedValueOnce({ ...nothingSent, acknowledged: 1 });

      await reportStationB();
      expect(flush).toHaveBeenCalledTimes(2);

      await act(async () => {
        jest.advanceTimersByTime(RETRY_DELAYS_MS[0]);
      });
      expect(flush).toHaveBeenCalledTimes(3);
      expect(screen.getByText("Position sendt.")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
