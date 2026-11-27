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
    const lines = getLines().map((line) => ({ ...line, tracks: [1, 2] }));
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
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
    await act(async () => {
      window.history.replaceState(null, "", "/admin/scenarios/new");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(state.view).toBe("group");
    await act(async () => state.navigate("home"));
    expect(window.location.pathname).toBe("/admin");
    confirm.mockRestore();
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
  it("confirms before discarding a draft from the dashboard button", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    await createLine();
    await act(async () => state.navigate("home"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state.view).toBe("editor");
    expect(state.routes).toHaveLength(1);
    expect(window.location.pathname).toBe("/admin/scenarios/new/M1_M2");
    confirm.mockReturnValue(true);
    await act(async () => state.navigate("home"));
    expect(state.view).toBe("home");
    expect(state.routes).toHaveLength(0);
    expect(window.location.pathname).toBe("/admin");
    confirm.mockRestore();
  });

  it("confirms and clears the draft before choosing a line group again", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    await createLine();
    await act(async () => state.navigate("group"));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state.view).toBe("editor");
    expect(state.routes).toHaveLength(1);
    expect(state.scenarioId).toBe("SCENARIO");
    confirm.mockReturnValue(true);
    await act(async () => state.navigate("group"));
    expect(state.view).toBe("group");
    expect(state.routes).toHaveLength(0);
    expect(state.scenarioId).toBe("");
    expect(window.location.pathname).toBe("/admin/scenarios/new");
    confirm.mockRestore();
  });

  it("protects the draft when browser back returns to line-group selection", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    await createLine();
    const editorUrl = window.location.href;
    await act(async () => {
      window.history.replaceState(null, "", "/admin/scenarios/new");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(state.view).toBe("editor");
    expect(state.routes).toHaveLength(1);
    expect(window.location.href).toBe(editorUrl);
    confirm.mockReturnValue(true);
    await act(async () => {
      window.history.replaceState(null, "", "/admin/scenarios/new");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(state.view).toBe("group");
    expect(state.routes).toHaveLength(0);
    expect(state.scenarioId).toBe("");
    confirm.mockRestore();
  });

  it("keeps the draft and URL when browser back is cancelled", async () => {
    const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
    await createLine();
    const editorUrl = window.location.href;
    await act(async () => {
      window.history.replaceState(null, "", "/admin");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(state.view).toBe("editor");
    expect(state.routes).toHaveLength(1);
    expect(window.location.href).toBe(editorUrl);
    confirm.mockReturnValue(true);
    await act(async () => {
      window.history.replaceState(null, "", "/admin");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(state.view).toBe("home");
    expect(state.routes).toHaveLength(0);
    confirm.mockRestore();
  });

  it("leaves an empty scenario without confirmation", async () => {
    const confirm = jest.spyOn(window, "confirm");
    await act(async () => state.navigate("group"));
    await act(async () => state.navigate("home"));
    expect(confirm).not.toHaveBeenCalled();
    expect(state.view).toBe("home");
    confirm.mockRestore();
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
  it("shows and reserves turnbacks beyond the passenger stops", async () => {
    await act(async () => state.selectGroup("M3/M4"));
    await act(async () => state.setScenarioName("Turnback"));
    await act(async () => state.setScenarioId("TURN"));
    await act(async () => state.startLine("MOP"));
    await act(async () => state.selectStation("EBR"));
    expect(state.type).toBe("ROUNDTRIP");
    expect(state.roundtripAllowed).toBe(true);
    expect(
      state.mapTurnbackExtensions.map(({ from, toward }) => [from, toward]),
    ).toEqual(
      expect.arrayContaining([
        ["MOP", "NEL"],
        ["EBR", "HOL"],
      ]),
    );
    expect(state.selectedStops).toEqual(["MOP", "EBR"]);
    await act(async () => state.setDid("D"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
    expect(state.routes[0].stops).toEqual(["MOP", "EBR"]);
    expect(state.mapTurnbackExtensions).toHaveLength(2);
    const network = jest.mocked(useNetwork).mock.results[0].value.network!;
    const reserved = network.segments
      .filter((segment) =>
        [
          ["NEL", "MOP"],
          ["EBR", "HOL"],
        ].some(
          ([a, b]) =>
            [a, b].includes(segment.stationA) &&
            [a, b].includes(segment.stationB),
        ),
      )
      .map((segment) => segment.id);
    expect(reserved).toHaveLength(4);
    jest.mocked(postJson).mockResolvedValue({ scenarioId: "TURN" });
    await act(async () => state.saveScenario());
    const body = jest.mocked(postJson).mock.calls[0][3] as {
      coveredSegmentIds: number[];
      patterns: { stops: string[] }[];
    };
    expect(body.patterns[0].stops).toEqual(["MOP", "EBR"]);
    expect(body.coveredSegmentIds.some((id) => reserved.includes(id))).toBe(
      false,
    );
  });
  it("orders stops along the route from the selected start and saves that order", async () => {
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.setScenarioId("ORDER"));
    await act(async () => state.setScenarioName("Order"));
    await act(async () => state.startLine("LIT"));
    await act(async () => state.selectStation("VAN"));
    await act(async () => state.selectStation("FL"));
    expect(state.selectedStops).toEqual(["LIT", "FL", "VAN"]);
    expect(state.path).toEqual(["LIT", "FL", "VAN"]);
    expect(state.from).toBe("LIT");
    expect(state.to).toBe("VAN");
    await act(async () => state.setManualType("PENDULUM"));
    await act(async () => state.setDid("DID"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
    jest.mocked(postJson).mockResolvedValue({ scenarioId: "ORDER" });
    await act(async () => state.saveScenario());
    expect(postJson).toHaveBeenCalledWith(
      "/api/v1/scenarios",
      token,
      expect.any(Function),
      expect.objectContaining({
        patterns: [expect.objectContaining({ stops: ["LIT", "FL", "VAN"] })],
      }),
    );
  });
  it("prevents a route that doubles back through a branch", async () => {
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.startLine("VAN"));
    await act(async () => state.selectStation("VEA"));
    await act(async () => state.selectStation("CPH"));
    expect(state.routeRepeatsStations).toBe(true);
    expect(state.path).toBeUndefined();
    await act(async () => state.setDid("DID"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
    expect(state.routes).toHaveLength(0);
    await act(async () => state.selectStation("CPH"));
    expect(state.routeRepeatsStations).toBe(false);
    expect(state.path).toBeDefined();
  });
  it("continues around the ring instead of doubling back to the final stop", async () => {
    await act(async () => state.selectGroup("M3/M4"));
    await act(async () => state.startLine("NEL"));
    for (const station of [
      "MOP",
      "SLU",
      "EBR",
      "HOL",
      "KH",
      "RHP",
      "GLS",
      "KGN",
      "MMK",
      "KK",
      "TRI",
      "FBA",
    ])
      await act(async () => state.selectStation(station));
    expect(state.selectedStops.at(-1)).toBe("FBA");
    expect(state.routeRepeatsStations).toBe(false);
    expect(state.path).toEqual([
      "NEL",
      "MOP",
      "SLU",
      "EBR",
      "HOL",
      "KH",
      "RHP",
      "GLS",
      "KGN",
      "MMK",
      "KK",
      "TRI",
      "PHP",
      "VHR",
      "SKP",
      "NØ",
      "NØR",
      "NUK",
      "AMH",
      "FB",
      "FBA",
    ]);
    await act(async () => state.setManualType("PENDULUM"));
    await act(async () => state.setDid("DID"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
    expect(state.routes).toHaveLength(1);
    expect(state.routes[0].stops?.at(-1)).toBe("FBA");
  });
  it("reorders existing ring stops when another direction becomes shorter", async () => {
    await act(async () => state.selectGroup("M3/M4"));
    await act(async () => state.startLine("NEL"));
    for (const station of ["KH", "GLS", "KGN", "MMK", "EHP"])
      await act(async () => state.selectStation(station));
    expect(state.selectedStops).toEqual([
      "NEL",
      "KH",
      "EHP",
      "MMK",
      "KGN",
      "GLS",
    ]);
    expect(state.path).toEqual([
      "NEL",
      "MOP",
      "SLU",
      "EBR",
      "HOL",
      "KH",
      "EHP",
      "FBA",
      "FB",
      "AMH",
      "NUK",
      "NØR",
      "NØ",
      "SKP",
      "VHR",
      "PHP",
      "TRI",
      "KK",
      "MMK",
      "KGN",
      "GLS",
    ]);
    await act(async () => state.selectStation("EHP"));
    expect(state.selectedStops).toEqual(["NEL", "KH", "GLS", "KGN", "MMK"]);
  });
  it("keeps the shortest automatic route across draft reload and line editing", async () => {
    await act(async () => state.selectGroup("M3/M4"));
    await act(async () => state.startLine("PHP"));
    for (const station of ["MMK", "GLS", "FB", "VHR"])
      await act(async () => state.selectStation(station));
    expect(state.path).toHaveLength(12);
    expect(["FB", "VHR"]).toContain(state.from);
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<View />));
    expect(state.path).toHaveLength(12);
    expect(["FB", "VHR"]).toContain(state.from);
    await act(async () => state.changeOperationType("PENDULUM"));
    await act(async () => state.changeTrack(2));
    expect(state.path).toHaveLength(12);
    await act(async () => state.setDid("DID"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
    await act(async () => state.editLine(state.routes[0]));
    expect(state.path).toHaveLength(12);
    expect(["FB", "VHR"]).toContain(state.from);
    await act(async () => state.selectStation("PHP"));
    expect(state.selectedStops).not.toContain("PHP");
  });
  it("reorders stops when changing tracks and restores the route after changing operation", async () => {
    const connections: [string, string][] = [
      ["A", "B"],
      ["B", "C"],
      ["C", "D"],
      ["A", "C"],
      ["B", "D"],
    ];
    const segments = connections.flatMap(([stationA, stationB]) =>
      (stationA === "B" && stationB === "C"
        ? ([1, 2] as const)
        : stationA === "A" && stationB === "C"
          ? ([2] as const)
          : stationA === "B" && stationB === "D"
            ? ([2] as const)
            : ([1] as const)
      ).map((trackNumber) => ({ id: 1, stationA, stationB, trackNumber })),
    );
    jest.mocked(useNetwork).mockReturnValue({
      network: {
        lines: [
          { name: "M1", tracks: [1], connections: connections.slice(0, 3) },
          {
            name: "M2",
            tracks: [2],
            connections: [connections[3], connections[1], connections[4]],
          },
        ],
        positions: { A: [0, 0], B: [1, 0], C: [2, 0], D: [3, 0] },
        segments,
        incomplete: false,
      },
      error: null,
      retry: jest.fn(),
    });
    await act(async () => root.render(<View />));
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.startLine("A"));
    await act(async () => state.changeOperationType("PENDULUM"));
    for (const station of ["B", "C", "D"])
      await act(async () => state.selectStation(station));
    expect(state.selectedStops).toEqual(["A", "B", "C", "D"]);
    await act(async () => state.changeTrack(2));
    expect(state.selectedStops).toEqual(["A", "C", "B", "D"]);
    expect(state.path).toEqual(["A", "C", "B", "D"]);
    await act(async () => state.changeOperationType("ROUNDTRIP"));
    expect(state.path).toBeUndefined();
    expect(state.selectedStops).toEqual(["A", "C", "B", "D"]);
    await act(async () => state.changeOperationType("PENDULUM"));
    expect(state.path).toEqual(["A", "C", "B", "D"]);
    await act(async () => state.changeTrack(1));
    expect(state.path).toEqual(["A", "B", "C", "D"]);
  });
  it("returns to pendulum when changing a two-track route removes an endpoint crossover", async () => {
    await act(async () => state.selectGroup("M1/M2"));
    await act(async () => state.startLine("VAN"));
    await act(async () => state.selectStation("FL"));
    expect(state.type).toBe("ROUNDTRIP");
    await act(async () => state.changeOperationType("ROUNDTRIP"));
    await act(async () => state.selectStation("LIT"));
    expect(state.type).toBe("PENDULUM");
    expect(state.path).toEqual(["VAN", "FL", "LIT"]);
    await act(async () => state.changeOperationType("ROUNDTRIP"));
    expect(state.type).toBe("ROUNDTRIP");
    expect(state.roundtripAllowed).toBe(false);
    await act(async () => state.updateSelectedStops(["VAN", "SOT"]));
    expect(state.type).toBe("PENDULUM");
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
    await act(async () => state.setDid("DID"));
    await act(async () => state.setMaximumTrains("2"));
    await act(async () => state.addLine(submit()));
    await act(async () => state.editLine(state.routes[0]));
    expect(state.from).toBe(state.to);
    expect(state.path?.[0]).toBe(state.path?.at(-1));
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
