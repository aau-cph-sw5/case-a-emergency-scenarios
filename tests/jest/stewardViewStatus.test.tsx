import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { sendPositionReport } from "../../mobile/src/api/position-report";
import { resetRememberedStatuses } from "../../mobile/src/data/steward-status";
import { StewardView } from "../../mobile/src/screens/StewardView";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import { useActiveScenario } from "../../shared/offline/use-active-scenario";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

// The view is driven by a given scenario view and a mocked position report,
// so no server, socket or storage is needed.
jest.mock("../../shared/offline/use-active-scenario", () => ({
  useActiveScenario: jest.fn(),
}));
jest.mock("../../shared/socket/useSocketState", () => ({
  useSocketState: () => ({ isConnected: true, messages: [] }),
}));
jest.mock("../../mobile/src/socket", () => ({
  socket: { on: jest.fn(), off: jest.fn() },
}));
jest.mock("../../mobile/src/offline/snapshot-store", () => ({
  snapshotStore: {},
}));
jest.mock("../../mobile/src/api/position-report", () => ({
  sendPositionReport: jest.fn(),
}));

const report = sendPositionReport as jest.MockedFunction<
  typeof sendPositionReport
>;
const activeScenario = useActiveScenario as jest.MockedFunction<
  typeof useActiveScenario
>;

// User 9 has no deployment in the fixture, so the steward starts with no status.
const snapshot = buildSnapshot(
  {
    active: true,
    state: activeState as ScenarioState,
    scenario: scenario as Scenario,
  },
  "9",
  new Date(),
);

function showView(view: ReturnType<typeof useActiveScenario>["view"]) {
  activeScenario.mockReturnValue({
    view,
    refresh: jest.fn(async () => {}),
    dismissNotice: jest.fn(),
  } as unknown as ReturnType<typeof useActiveScenario>);
}

async function renderView(online = true) {
  render(
    <StewardView
      token="token"
      online={online}
      onLogout={jest.fn()}
      onUnauthorized={jest.fn()}
    />,
  );
  // Lets the fetch of the current status settle.
  await act(async () => {});
}

beforeEach(() => {
  report.mockResolvedValue({ ok: true, message: "Position sendt: Station B" });
});

afterEach(() => resetRememberedStatuses());

describe("StewardView status (MET-A-015, #263, #305)", () => {
  it("goes from no status, via on the way and arrived, to checked out", async () => {
    showView({ status: "live", snapshot });
    await renderView();
    expect(screen.getByText("Ingen status")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    });

    expect(report).toHaveBeenCalledWith("token", "Station B", "EN_ROUTE");
    expect(screen.getByText(/DU ER PÅ VEJ/)).toBeTruthy();
    expect(screen.queryByLabelText("Meld dig på vej til Station B")).toBeNull();

    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });

    expect(report).toHaveBeenLastCalledWith("token", "Station B", "ARRIVED");
    expect(screen.getByText(/DU ER ANKOMMET/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("TJEK UD"));
    });

    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      "CHECKED_OUT",
    );
    expect(screen.getByText("Du er tjekket ud fra Station B.")).toBeTruthy();
    expect(screen.getByLabelText("Meld dig på vej til Station B")).toBeTruthy();
  });

  it("cancels while on the way and offers + again", async () => {
    showView({ status: "live", snapshot });
    await renderView();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    });
    await act(async () => {
      fireEvent.press(screen.getByText("FORTRYD"));
    });

    expect(report).toHaveBeenLastCalledWith("token", "Station B", "CANCELLED");
    expect(screen.getByText("Ingen status")).toBeTruthy();
    expect(screen.getByLabelText("Meld dig på vej til Station B")).toBeTruthy();
  });

  it("shows the refusal and keeps no status when the report is refused", async () => {
    report.mockResolvedValue({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
    });
    showView({ status: "live", snapshot });
    await renderView();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    });

    expect(
      screen.getByText("Stationen er ikke en del af det aktive scenarie."),
    ).toBeTruthy();
    expect(screen.getByText("Ingen status")).toBeTruthy();
  });

  it("offers no + and sends nothing while showing the saved copy", async () => {
    showView({ status: "copy", snapshot, reason: "offline" });
    await renderView(false);

    expect(
      screen.getByText(
        "Uden forbindelse kan din status ikke ændres. Du ser den gemte kopi.",
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Meld dig på vej til Station B")).toBeNull();
    expect(report).not.toHaveBeenCalled();
  });
});
