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
import { ScenarioBuilder } from "../../web/src/ScenarioBuilder";
import { AdminDashboard } from "../../web/src/AdminDashboard";
import { useNetwork } from "../../web/src/data/useNetwork";
import { postJson } from "../../web/src/get-json";
import { getLines, getStation } from "../../mockData/data";
jest.mock("../../web/src/AdminDashboard.css", () => ({}));
jest.mock("../../web/src/components/UserAdmin", () => ({
  UserAdmin: () => <div>Brugeradministration</div>,
}));
jest.mock("../../web/src/components/StationSelect.css", () => ({}));
jest.mock("../../web/src/components/ScenarioStaffingControls.css", () => ({}));
jest.mock("../../web/src/data/useNetwork", () => ({ useNetwork: jest.fn() }));
jest.mock("../../web/src/get-json", () => {
  const actual = jest.requireActual<typeof import("../../web/src/get-json")>(
    "../../web/src/get-json",
  );
  return { ...actual, postJson: jest.fn() };
});
jest.mock("../../shared/MapRenderer", () => ({
  __esModule: true,
  default: ({
    lines,
    onStationPress,
  }: {
    lines: { connections: string[][] }[];
    onStationPress?: (s: string) => void;
  }) => (
    <div>
      {onStationPress &&
        [...new Set(lines.flatMap((line) => line.connections.flat()))].map(
          (station) => (
            <button
              key={station}
              aria-label={`Vælg station ${station}`}
              onClick={() => onStationPress(station)}
            />
          ),
        )}
    </div>
  ),
}));
describe("scenario builder integration", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onLogout = jest.fn<() => void>(),
    onUsers = jest.fn<() => void>();
  const token = `header.${btoa(JSON.stringify({ userId: 123 }))}.signature`;
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes(text),
    )!;
  async function input(label: string, value: string) {
    const el = [...container.querySelectorAll("label")]
      .find((item) => item.textContent?.trim().startsWith(label))!
      .querySelector("input")!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    sessionStorage.clear();
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const lines = getLines().map((line) => ({ ...line, tracks: [1, 2] }));
    const names = [
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
          names.map((name) => [name, getStation(name)]),
        ),
        stationNames: { VAN: "Vanløse" },
        segments: [...edges.values()],
        incomplete: false,
      },
      error: null,
      retry: jest.fn(),
    });
    jest.mocked(postJson).mockReset();
    onUsers.mockClear();
    onLogout.mockClear();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  it("creates and edits a line, adds staffing and saves the scenario", async () => {
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Opret scenarie").click());
    await act(async () => button("M1 / M2").click());
    await input("Scenarie-ID", "TEST");
    await input("Scenarienavn", "Test scenario");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station VAN"]',
        )!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station LIT"]',
        )!
        .click(),
    );
    await act(async () => button("Pendul").click());
    await input("DID", "D");
    await input("Maksimalt antal tog", "2");
    await act(async () => button("Tilføj linje").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Rediger linje VAN til LIT"]',
        )!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station FL"]',
        )!
        .click(),
    );
    await act(async () => button("Gem ændringer").click());
    expect(container.querySelectorAll(".admin-route-list li")).toHaveLength(1);
    await act(async () => button("Næste: bemanding").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station VAN"]',
        )!
        .click(),
    );
    expect(container.textContent).toContain("Antal medarbejdere");
    jest.mocked(postJson).mockResolvedValue({ scenarioId: "TEST" });
    await act(async () => button("Gem scenarie").click());
    expect(postJson).toHaveBeenCalledWith(
      "/api/v1/scenarios",
      token,
      expect.any(Function),
      expect.objectContaining({
        scenarioId: "TEST",
        patterns: [expect.objectContaining({ stops: ["VAN", "FL", "LIT"] })],
        stationRequirements: [expect.objectContaining({ station: "VAN" })],
      }),
    );
    expect(container.textContent).toContain("Scenarie oprettet");
  });
  it("handles missing and incomplete network data", async () => {
    const current = jest.mocked(useNetwork)();
    const retry = jest.fn();
    jest
      .mocked(useNetwork)
      .mockReturnValue({ network: null, error: "Ingen forbindelse", retry });
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Opret scenarie").click());
    await act(async () => button("M1 / M2").click());
    expect(container.textContent).toContain("Ingen forbindelse");
    await act(async () => button("Prøv igen").click());
    expect(retry).toHaveBeenCalled();
    await act(async () => button("Vælg linjegruppe").click());
    jest.mocked(useNetwork).mockReturnValue({
      ...current,
      network: { ...current.network, incomplete: true },
      error: null,
      retry,
    });
    await act(async () => button("M1 / M2").click());
    expect(container.textContent).toContain("Metronetværket er ufuldstændigt");
    await act(async () => button("Prøv igen").click());
    await act(async () => button("Vælg linjegruppe").click());
    expect(retry).toHaveBeenCalledTimes(2);
  });
  it("selects every stop, clears a selection, cancels and removes a line", async () => {
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Opret scenarie").click());
    await act(async () => button("M1 / M2").click());
    await input("Scenarie-ID", "TEST");
    await input("Scenarienavn", "Test");
    await act(async () => button("Opret linje").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station VAN"]',
        )!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station LIT"]',
        )!
        .click(),
    );
    await act(async () => button("Vælg alle").click());
    expect(container.textContent).toContain("3 stationer valgt");
    await act(async () => button("Ryd valg").click());
    expect(container.textContent).toContain("Vælg linjens startstation");
    await act(async () => button("Annuller").click());
    await act(async () => button("Opret linje").click());
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station VAN"]',
        )!
        .click(),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '.admin-map-foreground [aria-label="Vælg station FL"]',
        )!
        .click(),
    );
    await input("DID", "D");
    await input("Maksimalt antal tog", "2");
    await act(async () => button("Tilføj linje").click());
    await act(async () => button("Fjern").click());
    expect(container.textContent).toContain("Ingen linjer oprettet endnu");
    await act(async () => button("Vælg linjegruppe").click());
    expect(container.textContent).toContain(
      "Vil du forlade scenariet? Dine ændringer bliver slettet.",
    );
    await act(async () => button("Annuller").click());
    expect(container.textContent).not.toContain("Vil du forlade scenariet?");
    expect(container.textContent).toContain("Linjegruppe: M1/M2");
    expect(
      [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.includes("Scenarienavn"))
        ?.querySelector("input")?.value,
    ).toBe("Test");
    await act(async () => button("Vælg linjegruppe").click());
    await act(async () => button("Forlad scenariet").click());
    expect(container.textContent).toContain("Vælg linjegruppe");
    await act(async () => button("M1 / M2").click());
    expect(
      [...container.querySelectorAll("label")]
        .find((label) => label.textContent?.includes("Scenarienavn"))
        ?.querySelector("input")?.value,
    ).toBe("");
  });
  it("closes the M3 ring from the map controls", async () => {
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Opret scenarie").click());
    await act(async () => button("M3 / M4").click());
    const ring = getLines()
      .find((line) => line.name === "M3")!
      .connections.map(([station]) => station);
    for (const station of ring)
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            `.admin-map-foreground [aria-label="Vælg station ${station}"]`,
          )!
          .click(),
      );
    await act(async () => button("Luk M3-ringen").click());
    expect(container.textContent).toContain(`${ring.length} stationer valgt`);
  });
  it("closes the M3 ring from a few stations spread around it", async () => {
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Opret scenarie").click());
    await act(async () => button("M3 / M4").click());
    const ring = getLines()
      .find((line) => line.name === "M3")!
      .connections.map(([station]) => station);
    const pick = [0, 4, 9, 13].map((index) => ring[index]);
    for (const station of pick.slice(0, 2))
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            `.admin-map-foreground [aria-label="Vælg station ${station}"]`,
          )!
          .click(),
      );
    expect(container.textContent).not.toContain("Luk M3-ringen");
    for (const station of pick.slice(2))
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            `.admin-map-foreground [aria-label="Vælg station ${station}"]`,
          )!
          .click(),
      );
    await act(async () => button("Luk M3-ringen").click());
    expect(container.textContent).toContain("4 stationer valgt");
    expect(container.textContent).not.toContain("Luk M3-ringen");
  });
  it("opens user administration from the integrated admin dashboard and returns", async () => {
    await act(async () =>
      root.render(<AdminDashboard token={token} onLogout={onLogout} />),
    );
    await act(async () => button("Brugere").click());
    expect(container.textContent).toContain("Brugeradministration");
    await act(async () => button("Tilbage").click());
    expect(container.textContent).toContain("Opret scenarie");
  });
  it("asks before signing out with an unfinished scenario", async () => {
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Opret scenarie").click());
    await act(async () => button("M1 / M2").click());
    await input("Scenarienavn", "Udkast");
    await act(async () => button("Log ud").click());
    await act(async () => button("Annuller").click());
    expect(onLogout).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Linjegruppe: M1/M2");
    await act(async () => button("Log ud").click());
    await act(async () => button("Forlad scenariet").click());
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
  it("keeps access to user management and sign out", async () => {
    await act(async () =>
      root.render(
        <ScenarioBuilder token={token} onUsers={onUsers} onLogout={onLogout} />,
      ),
    );
    await act(async () => button("Brugere").click());
    await act(async () => button("Log ud").click());
    expect(onUsers).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
