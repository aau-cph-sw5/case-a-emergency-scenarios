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
import { ERROR_CODES } from "../../shared/error-codes";
import { resetRememberedStatuses } from "../../mobile/src/data/steward-status";
import { StewardView } from "../../mobile/src/screens/StewardView";
import { socket } from "../../mobile/src/socket";
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

const refresh = jest.fn(async () => {});

function showView(view: ReturnType<typeof useActiveScenario>["view"]) {
  activeScenario.mockReturnValue({
    view,
    refresh,
    dismissNotice: jest.fn(),
  } as unknown as ReturnType<typeof useActiveScenario>);
}

// The same scenario as the server sends it after steward 9 arrived at
// Station B, while the app has nothing in memory (#310).
const arrivedOnServer = buildSnapshot(
  {
    active: true,
    state: {
      ...(activeState as ScenarioState),
      deployments: [
        {
          status: "MANNED",
          staff: "9",
          fulfills: "Station B",
          reportedAt: "2026-11-08T10:00:00Z",
          arrivedAt: "2026-11-08T10:00:00Z",
        },
      ],
    },
    scenario: scenario as Scenario,
  },
  "9",
  new Date(),
);

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

afterEach(() => {
  resetRememberedStatuses();
  refresh.mockClear();
});

describe("StewardView status (MET-A-015, #263, #305)", () => {
  it("goes from no status, via on the way and arrived, to checked out", async () => {
    showView({ status: "live", snapshot });
    await renderView();
    expect(screen.getByText("Ingen status")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    });

    expect(report).toHaveBeenCalledWith("token", "Station B", 1, "EN_ROUTE");
    expect(screen.getByText(/DU ER PÅ VEJ/)).toBeTruthy();
    expect(screen.queryByLabelText("Meld dig på vej til Station B")).toBeNull();

    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });

    expect(report).toHaveBeenLastCalledWith("token", "Station B", 1, "ARRIVED");
    expect(screen.getByText(/DU ER ANKOMMET/)).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("TJEK UD"));
    });

    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      1,
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

    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      1,
      "CANCELLED",
    );
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

  it("shows the server's status after a reload instead of no status (#310)", async () => {
    showView({ status: "live", snapshot: arrivedOnServer });
    await renderView();

    expect(screen.queryByText("Ingen status")).toBeNull();
    expect(screen.getByText(/DU ER ANKOMMET/)).toBeTruthy();
    expect(screen.getByText("TJEK UD")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText("TJEK UD"));
    });
    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      "CHECKED_OUT",
    );
  });

  it("shows the slide for a steward the server has on the way (#310)", async () => {
    // User 7 is on the way to Station B in the fixture.
    const onTheWay = buildSnapshot(
      {
        active: true,
        state: activeState as ScenarioState,
        scenario: scenario as Scenario,
      },
      "7",
      new Date(),
    );
    showView({ status: "live", snapshot: onTheWay });
    await renderView();

    expect(screen.getByText(/DU ER PÅ VEJ/)).toBeTruthy();
    expect(screen.getByTestId("slide-to-confirm")).toBeTruthy();
  });

  it("explains an E1006 refusal and fetches the scenario again (#310)", async () => {
    showView({ status: "live", snapshot });
    await renderView();
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    });
    report.mockResolvedValue({
      ok: false,
      message:
        "Din status er ændret et andet sted. Vi henter din aktuelle status.",
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
    });

    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });

    expect(
      screen.getByText(
        "Din status er ændret et andet sted. Vi henter din aktuelle status.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Positionen blev ikke modtaget.")).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  // + and the slide report the position, so the old picker and its button,
  // which sent a report the status did not know about, are gone (#310).
  it("has no separate station picker or Rapportér position button", async () => {
    showView({ status: "live", snapshot });
    await renderView();

    expect(screen.queryByText("Rapportér position")).toBeNull();
    expect(screen.queryByText(/Vælg station/)).toBeNull();
  });

  // Another steward's report changes the coverage; the phone fetches the
  // scenario again so its numbers and map follow (#310).
  it("fetches the scenario again when the coverage changes", async () => {
    showView({ status: "live", snapshot });
    await renderView();

    const on = socket.on as jest.Mock;
    const handler = on.mock.calls.find(
      ([name]) => name === "activations-changed",
    )?.[1] as (() => void) | undefined;
    expect(handler).toBeDefined();
    refresh.mockClear();
    await act(async () => handler?.());
    expect(refresh).toHaveBeenCalled();
  });

  // The same login checked out on another phone. The next copy of the
  // scenario must win over what this phone remembers (#310).
  it("follows a change made on another phone with the same login", async () => {
    showView({ status: "live", snapshot });
    // A new element each time, so React renders again with the new copy.
    const element = () => (
      <StewardView
        token="token"
        online
        onLogout={jest.fn()}
        onUnauthorized={jest.fn()}
      />
    );
    const view = render(element());
    await act(async () => {});
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Meld dig på vej til Station B"));
    });
    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });
    expect(screen.getByText(/DU ER ANKOMMET/)).toBeTruthy();

    const checkedOutElsewhere = buildSnapshot(
      {
        active: true,
        state: {
          ...(activeState as ScenarioState),
          deployments: [
            {
              status: "CHECKED_OUT",
              staff: "9",
              fulfills: "Station B",
              reportedAt: "2026-11-08T11:00:00Z",
              arrivedAt: "2026-11-08T10:00:00Z",
            },
          ],
        },
        scenario: scenario as Scenario,
      },
      "9",
      new Date(),
    );
    showView({ status: "live", snapshot: checkedOutElsewhere });
    view.rerender(element());
    await act(async () => {});

    expect(screen.queryByText(/DU ER ANKOMMET/)).toBeNull();
    expect(screen.getByText("Du er tjekket ud fra Station B.")).toBeTruthy();
  });
});
