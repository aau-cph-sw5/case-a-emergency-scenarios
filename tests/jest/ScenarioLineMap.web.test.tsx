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
import { ScenarioLineMap } from "../../web/src/components/ScenarioLineMap";
jest.mock("../../shared/MapRenderer", () => ({
  __esModule: true,
  default: ({
    onStationPress,
  }: {
    onStationPress?: (station: string) => void;
  }) => <button onClick={() => onStationPress?.("VAN")}>Station</button>,
}));
describe("scenario line map", () => {
  let container: HTMLDivElement;
  let root: Root;
  const select = jest.fn<(v: string) => void>(),
    all = jest.fn<() => void>(),
    clear = jest.fn<() => void>(),
    ring = jest.fn<() => void>();
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  async function show(
    editingLine: boolean,
    selectedStops: string[],
    canCloseRing = false,
  ) {
    await act(async () =>
      root.render(
        <ScenarioLineMap
          lineGroup="M1/M2"
          editingLine={editingLine}
          from={selectedStops[0] ?? ""}
          to={selectedStops[1] ?? ""}
          selectedStops={selectedStops}
          path={["VAN", "FL", "LIT"]}
          canCloseRing={canCloseRing}
          onSelectAll={all}
          onCloseRing={ring}
          onClear={clear}
          backgroundLines={[]}
          mapLines={[]}
          backgroundColors={{}}
          colors={{}}
          stationPositions={{}}
          ringStations={[]}
          availableSegments={[]}
          mapCrossovers={[]}
          mapStops={selectedStops}
          selectStation={select}
        />,
      ),
    );
  }
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes(text),
    )!;
  it("selects stations and offers controls for a line", async () => {
    await show(true, ["VAN", "LIT"], true);
    expect(container.textContent).toContain("2 stationer valgt");
    expect(
      container.querySelector(".admin-map .admin-map-legend")?.textContent,
    ).toContain("Stop på linjen");
    await act(async () => button("Vælg alle").click());
    await act(async () => button("Luk M3-ringen").click());
    await act(async () => button("Ryd valg").click());
    const station = container.querySelector<HTMLButtonElement>(
      ".admin-map-foreground button",
    )!;
    await act(async () => station.click());
    expect(all).toHaveBeenCalled();
    expect(ring).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith("VAN");
  });
  it("explains how to start or continue selection", async () => {
    await show(false, []);
    expect(container.textContent).toContain(
      "Klik på en station for at starte en linje",
    );
    await show(true, []);
    expect(container.textContent).toContain("Vælg linjens startstation");
    await show(true, ["VAN"]);
    expect(container.textContent).toContain("Klik på næste station");
  });
});
