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
import { fetchSuggestions } from "../../web/src/suggestions";

jest.mock("../../web/src/suggestions", () => ({ fetchSuggestions: jest.fn() }));

const fetchMock = jest.mocked(fetchSuggestions);

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
let container: HTMLDivElement;
let root: Root;

async function renderPicker() {
  await act(async () => {
    root.render(
      <ScenarioPicker
        token="operator-token"
        scenarios={scenarios}
        scenariosError={null}
        reloadScenarios={() => {}}
        selectedId={null}
        activeIds={new Set()}
        activeFailed={false}
        busy={false}
        hidden={false}
        closing={false}
        onSelect={onSelect}
        onExitEnd={() => {}}
      />,
    );
  });
}

function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.trim().startsWith(name),
  );
  if (!found) throw new Error(`No button: ${name}`);
  return found;
}

async function click(name: string) {
  await act(async () => button(name).click());
}

function field(): HTMLTextAreaElement {
  return container.querySelector("textarea")!;
}

function search(): HTMLInputElement {
  return container.querySelector<HTMLInputElement>("#scenario-search")!;
}

async function type(el: HTMLTextAreaElement | HTMLInputElement, text: string) {
  await act(async () => {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  HTMLFormElement.prototype.requestSubmit = function () {
    this.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  };
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
});

describe("scenario picker", () => {
  it("starts on the list and keeps the description when switching back", async () => {
    await renderPicker();
    // The describe tab is hidden until it is chosen.
    expect(field().closest("[hidden]")).not.toBeNull();
    await click("Beskriv hændelse");
    expect(field().closest("[hidden]")).toBeNull();
    await type(field(), "signalfejl");
    await click("Vælg fra liste");
    await click("Beskriv hændelse");
    expect(field().value).toBe("signalfejl");
  });

  it("filters the list by a station the scenario covers", async () => {
    await renderPicker();
    await type(search(), "nørreport");
    expect(container.textContent).toContain("1 af 2 scenarier");
    expect(container.textContent).toContain("Strømsvigt Forum");
  });

  it("selects a scenario from the list", async () => {
    await renderPicker();
    await click("Strømsvigt Forum");
    expect(onSelect).toHaveBeenCalledWith("S2");
  });

  it("clears the search and moves focus to the list when no suggestion is confident", async () => {
    fetchMock.mockResolvedValue({ status: "NO_CONFIDENT_CANDIDATE" });
    await renderPicker();
    await type(search(), "forum");
    await click("Beskriv hændelse");
    await type(field(), "noget helt andet");
    await click("Foreslå scenarie");
    await click("Gå til listen");
    expect(search()).toBe(document.activeElement);
    expect(search().value).toBe("");
  });

  it("selects the scenario of a suggestion made on the describe tab", async () => {
    fetchMock.mockResolvedValue({
      status: "CONFIDENT",
      candidates: [{ scenarioId: "S1", score: 0.9 }],
    });
    await renderPicker();
    await click("Beskriv hændelse");
    await type(field(), "signalfejl ved vanløse");
    await click("Foreslå scenarie");
    await act(async () =>
      container.querySelector<HTMLButtonElement>(".suggest-result")!.click(),
    );
    expect(onSelect).toHaveBeenCalledWith("S1");
  });
});
