import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Profiler } from "react";
import { sendPositionReport } from "../../mobile/src/api/position-report";
import { ERROR_CODES } from "../../shared/error-codes";
import { resetRememberedStatuses } from "../../mobile/src/data/steward-status";
import { StewardView } from "../../mobile/src/screens/StewardView";
import { positionReportDelivery } from "../../mobile/src/offline/position-report-delivery-instance";
import { queuePositionReport } from "../../mobile/src/offline/queue-position-report";
import {
  reportRejection,
  waitingReport,
} from "../../mobile/src/offline/waiting-report";
import { socket } from "../../mobile/src/socket";
import activeState from "../../fixtures/v1/scenario-state.json";
import scenario from "../../fixtures/v1/scenarios/DEMO-001.json";
import { buildSnapshot } from "../../shared/offline/scenario-snapshot";
import { useActiveScenario } from "../../shared/offline/use-active-scenario";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

// Choosing a station is a tap on its row and the yellow BEKRÆFT slide, and
// cancelling is the own row's swipe (or tap) and BEKRÆFT ANNULLÉR (#376).
// Each step is its own act, so the screen has the new state before the next.
async function chooseStation(station: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(`Vælg ${station}`));
  });
  await act(async () => {
    fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
  });
}

// Checking out is TJEK UD and then the red slide (#377).
async function checkOut() {
  const tjekUd = await screen.findByText("TJEK UD");
  await act(async () => {
    fireEvent.press(tjekUd);
  });
  // The red slide takes the button's place with the shared-axis change.
  await screen.findByText("BEKRÆFT TJEK UD");
  await act(async () => {
    fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
  });
}

async function cancelStation(station: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(`Annullér ${station}`));
  });
  await act(async () => {
    fireEvent.press(screen.getByText("BEKRÆFT ANNULLÉR"));
  });
}

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
  ...jest.requireActual<object>("../../mobile/src/api/position-report"),
  sendPositionReport: jest.fn(),
}));
jest.mock("../../mobile/src/offline/waiting-report", () => ({
  waitingReport: jest.fn(async () => null),
  reportRejection: jest.fn(async () => null),
}));
jest.mock("../../mobile/src/offline/queue-position-report", () => ({
  queuePositionReport: jest.fn(),
}));
jest.mock("../../mobile/src/offline/position-report-delivery-instance", () => ({
  positionReportDelivery: {
    flush: jest.fn(async () => ({
      acknowledged: 0,
      rejected: 0,
      pending: 0,
      superseded: [],
    })),
  },
}));

const report = sendPositionReport as jest.MockedFunction<
  typeof sendPositionReport
>;
const queue = jest.mocked(queuePositionReport);
const flush = jest.mocked(positionReportDelivery.flush);
const waiting = jest.mocked(waitingReport);
const rejection = jest.mocked(reportRejection);

// Steward 9's report to Station B as it is saved on the phone.
const queuedReport = {
  id: "report-9",
  userId: "9",
  station: "Station B",
  reportedAt: "2026-11-08T10:00:00Z",
  scenarioId: "DEMO-001",
  activationId: 1,
  event: "EN_ROUTE" as const,
};
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
  queue.mockResolvedValue(queuedReport);
  waiting.mockResolvedValue(null);
  rejection.mockResolvedValue(null);
});

afterEach(() => {
  resetRememberedStatuses();
  refresh.mockClear();
});

describe("StewardView status (MET-A-015, #263, #305)", () => {
  it("goes from no status, via on the way and arrived, to checked out", async () => {
    showView({ status: "live", snapshot });
    await renderView();
    expect(await screen.findByText("IKKE VALGT")).toBeTruthy();

    await chooseStation("Station B");

    expect(queue).toHaveBeenCalledWith({
      userId: "9",
      station: "Station B",
      scenarioId: "DEMO-001",
      activationId: 1,
      event: "EN_ROUTE",
    });
    expect(report).not.toHaveBeenCalledWith(
      "token",
      "Station B",
      1,
      "EN_ROUTE",
    );
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
    expect(screen.queryByLabelText("Vælg Station B")).toBeNull();

    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });

    expect(report).toHaveBeenLastCalledWith("token", "Station B", 1, "ARRIVED");
    expect(await screen.findByText(/^ANKOMMET/)).toBeTruthy();

    await checkOut();

    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      1,
      "CHECKED_OUT",
    );
    expect(await screen.findByText("IKKE VALGT")).toBeTruthy();
    expect(screen.getByLabelText("Vælg Station B")).toBeTruthy();
  });

  it("cancels while on the way and offers + again", async () => {
    showView({ status: "live", snapshot });
    await renderView();

    await chooseStation("Station B");
    await cancelStation("Station B");

    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      1,
      "CANCELLED",
    );
    expect(await screen.findByText("IKKE VALGT")).toBeTruthy();
    expect(screen.getByLabelText("Vælg Station B")).toBeTruthy();
  });

  it("shows the refusal and keeps the status when arriving is refused", async () => {
    showView({ status: "live", snapshot });
    await renderView();
    await chooseStation("Station B");
    report.mockResolvedValue({
      ok: false,
      message: "Stationen er ikke en del af det aktive scenarie.",
    });

    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });

    expect(
      screen.getByText("Stationen er ikke en del af det aktive scenarie."),
    ).toBeTruthy();
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
  });

  it("shows the refusal and keeps no status when going on the way is refused", async () => {
    rejection.mockResolvedValue({
      httpStatus: 409,
      code: ERROR_CODES.STATION_NOT_IN_SCENARIO,
    });
    showView({ status: "live", snapshot });
    await renderView();

    await chooseStation("Station B");

    expect(rejection).toHaveBeenCalledWith("9", "report-9");
    expect(
      screen.getByText("Stationen er ikke en del af det aktive scenarie."),
    ).toBeTruthy();
    expect(await screen.findByText("IKKE VALGT")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("PÅ VEJ")).toBeNull());
  });

  it("keeps the status from a waiting report when the saved copy is loaded again", async () => {
    waiting.mockResolvedValue(queuedReport);
    showView({ status: "copy", snapshot, reason: "offline" });
    await renderView(false);

    expect(waiting).toHaveBeenCalledWith("9", 1);
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("IKKE VALGT")).toBeNull());
  });

  it("blocks arriving and cancelling while a report waits to be sent", async () => {
    waiting.mockResolvedValue(queuedReport);
    showView({ status: "live", snapshot });
    await renderView();

    expect(
      screen.getByText(
        "Din position er ikke sendt endnu. Du kan ændre status, når den er modtaget.",
      ),
    ).toBeTruthy();
    // The own row cannot be opened, so BEKRÆFT ANNULLÉR stays hidden (#376).
    await act(async () => {
      fireEvent.press(screen.getByLabelText("Annullér Station B"));
    });
    expect(screen.queryByText("BEKRÆFT ANNULLÉR")).toBeNull();
    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });

    expect(report).not.toHaveBeenCalled();
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
  });

  it("offers + on the saved copy and keeps the report on the phone", async () => {
    showView({ status: "copy", snapshot, reason: "offline" });
    await renderView(false);

    expect(
      screen.getByText(
        "Uden forbindelse kan du kun melde dig på vej. Du ser den gemte kopi.",
      ),
    ).toBeTruthy();
    await chooseStation("Station B");

    expect(queue).toHaveBeenCalledWith({
      userId: "9",
      station: "Station B",
      scenarioId: "DEMO-001",
      activationId: 1,
      event: "EN_ROUTE",
    });
    // Saved on the phone; the status box shows the change, no extra line.
    expect(screen.queryByText("Position gemt. Afventer levering.")).toBeNull();
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });
    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
    expect(flush).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it("shows the server's status after a reload instead of no status (#310)", async () => {
    showView({ status: "live", snapshot: arrivedOnServer });
    await renderView();

    await waitFor(() => expect(screen.queryByText("IKKE VALGT")).toBeNull());
    expect(await screen.findByText(/^ANKOMMET/)).toBeTruthy();
    expect(await screen.findByText("TJEK UD")).toBeTruthy();

    await checkOut();
    expect(report).toHaveBeenLastCalledWith(
      "token",
      "Station B",
      1,
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

    expect(await screen.findByText("PÅ VEJ")).toBeTruthy();
    expect(screen.getByTestId("slide-to-confirm")).toBeTruthy();
  });

  it("explains an E1006 refusal and fetches the scenario again (#310)", async () => {
    showView({ status: "live", snapshot });
    await renderView();
    await chooseStation("Station B");
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
    await chooseStation("Station B");
    await act(async () => {
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    });
    expect(await screen.findByText(/^ANKOMMET/)).toBeTruthy();

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

    expect(await screen.findByText("IKKE VALGT")).toBeTruthy();
    expect(screen.queryByText(/^ANKOMMET/)).toBeNull();
  });

  // SMOOTH TRANSITIONS (#376): through a whole shift, no text may show for a
  // moment and go again within one action (a flash), and the control at the
  // bottom may never be missing while the steward has no station or is on
  // the way (the list above it would jump). Every render is checked.
  it("never flashes text or loses the bottom control through a shift", async () => {
    showView({ status: "live", snapshot });
    report.mockResolvedValue({ ok: true, message: "" });
    const visible = () => {
      const out = new Set<string>();
      const walk = (node: unknown) => {
        if (typeof node === "string") out.add(node);
        else if (Array.isArray(node)) node.forEach(walk);
        else if (node && typeof node === "object")
          walk((node as { children?: unknown }).children);
      };
      walk(screen.toJSON());
      return out;
    };
    let action = "";
    let seen = new Map<string, number>();
    let commit = 0;
    const problems: string[] = [];
    let last = new Set<string>();
    const check = () => {
      commit += 1;
      if (action === "") return;
      const now = visible();
      for (const t of now) if (!last.has(t)) seen.set(t, commit);
      for (const t of last)
        if (!now.has(t) && seen.get(t) !== undefined)
          problems.push(`${action}: "${t}" showed and went again`);
      if (
        !screen.queryByTestId("slide-to-confirm", {
          includeHiddenElements: true,
        }) &&
        !now.has("TJEK UD")
      )
        problems.push(`${action}: no control at the bottom (render ${commit})`);
      last = now;
    };
    const step = async (name: string, act1: () => void) => {
      action = name;
      last = visible();
      seen = new Map();
      await act(async () => act1());
      await act(async () => {
        await new Promise((r) => setTimeout(r, 900));
      });
      action = "";
    };
    const slide = () =>
      fireEvent(screen.getByTestId("slide-to-confirm"), "accessibilityAction", {
        nativeEvent: { actionName: "activate" },
      });
    render(
      <Profiler id="shift" onRender={check}>
        <StewardView
          token="token"
          online
          onLogout={jest.fn()}
          onUnauthorized={jest.fn()}
        />
      </Profiler>,
    );
    await act(async () => {});
    await step("choose", () =>
      fireEvent.press(screen.getByLabelText("Vælg Station B")),
    );
    await step("assign", slide);
    await step("open the row", () =>
      fireEvent.press(screen.getByLabelText("Annullér Station B")),
    );
    await step("cancel", () =>
      fireEvent.press(screen.getByText("BEKRÆFT ANNULLÉR")),
    );
    await step("choose again", () =>
      fireEvent.press(screen.getByLabelText("Vælg Station B")),
    );
    await step("assign again", slide);
    await step("check in", slide);
    await screen.findByText("TJEK UD");
    await step("check out", () => fireEvent.press(screen.getByText("TJEK UD")));
    await step("confirm check out", slide);
    expect(problems).toEqual([]);
  }, 20000);
});
