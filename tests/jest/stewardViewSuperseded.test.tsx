import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { StewardView } from "../../mobile/src/screens/StewardView";
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
jest.mock("../../shared/offline/use-active-scenario", () => ({
  useActiveScenario: jest.fn(),
}));

const { useActiveScenario } = jest.requireMock(
  "../../shared/offline/use-active-scenario",
) as { useActiveScenario: jest.Mock };
const flush = jest.mocked(positionReportDelivery.flush);

const snapshot = buildSnapshot(
  {
    active: true,
    state: activeState as ScenarioState,
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
      superseded: [
        {
          id: "report-1",
          userId: "7",
          station: "Station B",
          reportedAt: "2026-11-06T08:00:00Z",
          scenarioId: "DEMO-001",
          activationId: 1,
        },
      ],
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
});
