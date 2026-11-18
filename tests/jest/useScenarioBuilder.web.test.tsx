import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { useScenarioBuilder } from "../../web/src/useScenarioBuilder";
import { useNetwork } from "../../web/src/data/useNetwork";
import { postJson } from "../../web/src/get-json";
import { getLines, getStation } from "../../mockData/data";

jest.mock("../../web/src/components/ScenarioStaffingControls.css", () => ({}));
jest.mock("../../web/src/components/StationSelect.css", () => ({}));
jest.mock("../../web/src/data/useNetwork", () => ({ useNetwork: jest.fn() }));
jest.mock("../../web/src/get-json", () => {
  const actual = jest.requireActual<typeof import("../../web/src/get-json")>(
    "../../web/src/get-json",
  );
  return { ...actual, postJson: jest.fn() };
});
describe("scenario editor state", () => {
  let root: Root;
  let container: HTMLDivElement;
  let state: ReturnType<typeof useScenarioBuilder>;
  const token = `header.${btoa(JSON.stringify({ userId: 123 }))}.signature`;
  function View() {
    state = useScenarioBuilder(token);
    return null;
  }
  const submit = () =>
    ({
      preventDefault: jest.fn(),
    }) as unknown as React.FormEvent<HTMLFormElement>;
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const lines = getLines();
    const stationCodes = [
      ...new Set(lines.flatMap((line) => line.connections.flat())),
    ];
    const edges = new Map<
      string,
      { id: number; trackNumber: 1 | 2; stationA: string; stationB: string }
    >();
    for (const line of lines)
      for (const [stationA, stationB] of line.connections)
        for (const trackNumber of [1, 2] as const) {
          const key = JSON.stringify([
            trackNumber,
            ...[stationA, stationB].sort(),
          ]);
          if (!edges.has(key))
            edges.set(key, {
              id: edges.size + 1,
              trackNumber,
              stationA,
              stationB,
            });
        }
    jest.mocked(useNetwork).mockReturnValue({
      network: {
        lines,
        positions: Object.fromEntries(
          stationCodes.map((station) => [station, getStation(station)]),
        ),
        stationNames: { VAN: "Vanløse" },
        segments: [...edges.values()],
        incomplete: false,
      },
      error: null,
      retry: jest.fn(),
    });
    jest.mocked(postJson).mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<View />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  async function createLine() {
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.setScenarioName("Test"));
    await act(async () => state.setScenarioId("SCENARIO"));
    await act(async () => state.startLine("VAN"));
    await act(async () => state.selectStation("FL"));
    await act(async () => state.setDid("DID"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
  }
  it("uses admin paths and restores the view on browser navigation", async () => {
    await act(async () => state.navigate("group"));
    expect(window.location.pathname).toBe("/admin/scenarios/new");
    await act(async () => state.selectGroup("M1/M2"));
    expect(window.location.pathname).toBe("/admin/scenarios/new/M1_M2");
    await act(async () => state.startLine("VAN"));
    expect(new URLSearchParams(window.location.search).get("line")).toBe("new");
    await act(async () => {
      window.history.replaceState(null, "", "/admin/scenarios/new");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(state.view).toBe("group");
    await act(async () => state.navigate("home"));
    expect(window.location.pathname).toBe("/admin");
  });
  it("restores the editor and its draft when the line-group URL reloads", async () => {
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.setScenarioId("VAN-FB"));
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<View />));
    expect(state.view).toBe("editor");
    expect(state.lineGroup).toBe("M1/M2");
    expect(state.scenarioId).toBe("VAN-FB");
  });
  it("creates, edits and saves a line without losing its stops or staffing", async () => {
    await createLine();
    expect(state.routes).toHaveLength(1);
    expect(state.routes[0].stops).toEqual(["VAN", "FL"]);
    await act(async () => state.editLine(state.routes[0]));
    await act(async () => state.selectStation("LIT"));
    await act(async () => state.setManualType("PENDULUM"));
    await act(async () => state.addLine(submit()));
    expect(state.routes).toHaveLength(1);
    expect(state.routes[0].stops).toEqual(["VAN", "FL", "LIT"]);
    await act(async () =>
      state.setStaffing([
        {
          station: "VAN",
          placement: "Perron",
          minimumStaffing: 2,
          tasks: [{ id: 1, instruction: "Help" }],
          windows: [
            {
              id: 1,
              dayPattern: "man–fre",
              startTime: "07:00",
              endTime: "09:00",
            },
          ],
        },
      ]),
    );
    jest.mocked(postJson).mockResolvedValue({ scenarioId: "SCENARIO" });
    await act(async () => state.saveScenario());
    expect(postJson).toHaveBeenCalledWith(
      "/api/v1/scenarios",
      token,
      expect.any(Function),
      expect.objectContaining({
        scenarioId: "SCENARIO",
        patterns: [expect.objectContaining({ stops: ["VAN", "FL", "LIT"] })],
        stationRequirements: [
          expect.objectContaining({ station: "VAN", minimumStaffing: 2 }),
        ],
      }),
    );
    expect(state.view).toBe("complete");
    await act(async () => state.createAnother());
    expect(state.view).toBe("group");
    expect(state.routes).toHaveLength(0);
  });
  it("validates tasks and staffing windows before saving", async () => {
    await createLine();
    await act(async () =>
      state.setStaffing([
        {
          station: "VAN",
          placement: "",
          minimumStaffing: 1,
          tasks: [{ id: 1, instruction: " " }],
        },
      ]),
    );
    await act(async () => state.saveScenario());
    expect(state.saveError).toContain("tomme opgaver");
    expect(postJson).not.toHaveBeenCalled();
    await act(async () =>
      state.setStaffing([
        {
          station: "VAN",
          placement: "",
          minimumStaffing: 1,
          tasks: [],
          windows: [
            {
              id: 1,
              dayPattern: "man–fre",
              startTime: "12:00",
              endTime: "12:00",
            },
          ],
        },
      ]),
    );
    await act(async () => state.saveScenario());
    expect(state.saveError).toContain("forskellige tidspunkter");
  });
  it("clears a selected station and keeps a closed M3 ring when adding or removing stops", async () => {
    await act(async () => state.selectGroup("M3/M4"));
    await act(async () => state.startLine());
    for (const station of state.ringStations)
      await act(async () => state.selectStation(station));
    expect(state.canCloseRing).toBe(true);
    await act(async () => {
      state.setSelectedStops(state.ringStops);
      state.setFrom(state.ringStops[0]);
      state.setTo(state.ringStops[0]);
      state.setManualType("ROUNDTRIP");
    });
    const removed = state.ringStations.find(
      (station) => station !== state.from,
    )!;
    await act(async () => state.selectStation(removed));
    expect(state.from).toBe(state.to);
    expect(state.path?.[0]).toBe(state.path?.at(-1));
    await act(async () => state.selectStation(removed));
    expect(state.from).toBe(state.to);
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.startLine("VAN"));
    await act(async () => state.selectStation("VAN"));
    expect(state.selectedStops).toEqual([]);
  });
  it("keeps the line when cancelling an edit and reports a failed save", async () => {
    await createLine();
    const original = state.routes[0];
    await act(async () => state.editLine(original));
    await act(async () => state.resetLineDraft());
    expect(state.routes[0]).toEqual(original);
    jest.mocked(postJson).mockRejectedValue(new Error("offline"));
    await act(async () => state.saveScenario());
    expect(state.saveError).toBeTruthy();
  });
});
