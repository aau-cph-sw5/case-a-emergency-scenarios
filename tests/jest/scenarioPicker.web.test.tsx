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
import { ScenarioPicker } from "../../web/src/ScenarioPicker";
import type { ScenarioSummary } from "../../web/src/scenarios";

const scenarios: ScenarioSummary[] = [
  {
    scenarioId: "S1",
    name: "Signalfejl Vanløse",
    covers: [
      { trackNumber: 1, stationA: "frederiksberg", stationB: "flintholm" },
      { trackNumber: 1, stationA: "flintholm", stationB: "vanløse" },
    ],
  },
  {
    scenarioId: "S2",
    name: "Strømsvigt Forum",
    covers: [{ trackNumber: 1, stationA: "forum", stationB: "nørreport" }],
  },
];

const onSelect = jest.fn<(id: string | null) => void>();
const onExitEnd = jest.fn<() => void>();
const reload = jest.fn<() => void>();
let container: HTMLDivElement;
let root: Root;

type Props = Partial<Parameters<typeof ScenarioPicker>[0]>;

async function renderPicker(props: Props = {}) {
  await act(async () => {
    root.render(
      <ScenarioPicker
        token="operator-token"
        scenarios={scenarios}
        scenariosError={null}
        reloadScenarios={reload}
        selectedId={null}
        activeIds={new Set()}
        activeFailed={false}
        busy={false}
        hidden={false}
        closing={false}
        onSelect={onSelect}
        onExitEnd={onExitEnd}
        {...props}
      />,
    );
  });
}

function search(): HTMLInputElement {
  return container.querySelector<HTMLInputElement>("#scenario-search")!;
}

async function type(text: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search(), text);
    search().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.trim().startsWith(name),
  );
  if (!found) throw new Error(`No button: ${name}`);
  return found;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("scenario picker", () => {
  it("lists the scenarios with their route and selects one", async () => {
    await renderPicker();
    expect(container.textContent).toContain("2 scenarier");
    expect(container.textContent).toContain("Frederiksberg ↔ Vanløse");
    await act(async () => button("Strømsvigt Forum").click());
    expect(onSelect).toHaveBeenCalledWith("S2");
  });

  it("searches by name and by a station the scenario covers", async () => {
    await renderPicker();
    await type("nørreport");
    expect(container.textContent).toContain("1 af 2 scenarier");
    expect(container.textContent).toContain("Strømsvigt Forum");
    expect(container.textContent).not.toContain("Signalfejl Vanløse");
    await type("ingenting");
    expect(container.textContent).toContain("Ingen scenarier matcher");
  });

  it("clears the search when the picker is hidden by a running scenario", async () => {
    await renderPicker();
    await type("forum");
    await renderPicker({ hidden: true });
    await renderPicker({ hidden: false });
    expect(search().value).toBe("");
  });

  it("shows loading, empty and error states, and can retry", async () => {
    await renderPicker({ scenarios: null });
    expect(container.textContent).toContain("Henter scenarier");
    await renderPicker({ scenarios: [] });
    expect(container.textContent).toContain("Ingen scenarier tilgængelige");
    await renderPicker({ scenarios: null, scenariosError: "boom" });
    expect(container.querySelector("[role=alert]")?.textContent).toContain(
      "boom",
    );
    await act(async () => button("Prøv igen").click());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("says when the active scenarios could not be shown", async () => {
    await renderPicker({ activeFailed: true });
    expect(container.textContent).toContain(
      "Aktive scenarier kunne ikke vises",
    );
  });

  it("reports the end of its own exit animation only while closing", async () => {
    const fire = async () =>
      act(async () => {
        const event = new Event("animationend", { bubbles: true });
        Object.assign(event, { animationName: "scenario-picker-out" });
        container.querySelector(".scenario-picker")!.dispatchEvent(event);
      });
    await renderPicker();
    await fire();
    expect(onExitEnd).not.toHaveBeenCalled();
    await renderPicker({ closing: true });
    await fire();
    expect(onExitEnd).toHaveBeenCalledTimes(1);
  });
});
