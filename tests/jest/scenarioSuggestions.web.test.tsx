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
import { ApiError } from "../../web/src/get-json";
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

async function renderPicker(selectedId: string | null = null) {
  await act(async () => {
    root.render(
      <ScenarioPicker
        token="operator-token"
        scenarios={scenarios}
        scenariosError={null}
        reloadScenarios={() => {}}
        selectedId={selectedId}
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

function button(name: string | RegExp): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((item) =>
    typeof name === "string"
      ? item.textContent?.trim() === name
      : name.test(item.textContent ?? ""),
  );
  if (!found) throw new Error(`No button: ${name}`);
  return found;
}

async function click(name: string | RegExp) {
  await act(async () => button(name).click());
}

function field(): HTMLTextAreaElement {
  return container.querySelector("textarea")!;
}

async function type(text: string) {
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!;
    setValue.call(field(), text);
    field().dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function press(key: string, shiftKey = false) {
  await act(async () => {
    field().dispatchEvent(
      new KeyboardEvent("keydown", { key, shiftKey, bubbles: true }),
    );
  });
}

async function describeMode(text = "") {
  await renderPicker();
  await click("Beskriv hændelse");
  if (text) await type(text);
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
    await type("signalfejl");
    await click("Vælg fra liste");
    await click("Beskriv hændelse");
    expect(field().value).toBe("signalfejl");
  });

  it("filters the list by a station the scenario covers", async () => {
    await renderPicker();
    const search =
      container.querySelector<HTMLInputElement>("#scenario-search")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(search, "nørreport");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("1 af 2 scenarier");
    expect(container.textContent).toContain("Strømsvigt Forum");
  });
});

describe("scenario suggestions", () => {
  it("shows ranked suggestions with the route and matched stations, and only selects", async () => {
    fetchMock.mockResolvedValue({
      status: "CONFIDENT",
      candidates: [{ scenarioId: "S1", score: 0.87 }],
    });
    await describeMode("signalfejl ved vanløse");
    await click("Foreslå scenarie");
    expect(fetchMock).toHaveBeenCalledWith(
      "operator-token",
      "signalfejl ved vanløse",
      expect.any(AbortSignal),
    );
    expect(container.textContent).toContain("87 %");
    expect(container.textContent).toContain("Frederiksberg ↔ Vanløse");
    expect(container.textContent).toContain("Vanløse");
    expect(container.textContent).toContain("1 forslag fundet.");
    await click(/Signalfejl Vanløse/);
    expect(onSelect).toHaveBeenCalledWith("S1");
    // A suggestion never starts anything: there is no activation here.
    expect(container.textContent).not.toContain("START");
  });

  it("tells the operator when no candidate is confident and offers the list", async () => {
    fetchMock.mockResolvedValue({ status: "NO_CONFIDENT_CANDIDATE" });
    await describeMode("noget helt andet");
    await click("Foreslå scenarie");
    expect(container.textContent).toContain("Ingen sikre forslag");
    await click("Gå til listen");
    expect(container.querySelector("#scenario-search")).toBe(
      document.activeElement,
    );
  });

  it("asks for a description before sending anything", async () => {
    await describeMode();
    await click("Foreslå scenarie");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Skriv en kort beskrivelse",
    );
    await type("signalfejl");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("sends on Enter but not on Shift + Enter", async () => {
    fetchMock.mockResolvedValue({ status: "NO_CONFIDENT_CANDIDATE" });
    await describeMode("signalfejl");
    await press("Enter", true);
    expect(fetchMock).not.toHaveBeenCalled();
    await press("Enter");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows labelled examples while the endpoint answers 404", async () => {
    fetchMock.mockRejectedValue(new ApiError("not found", 404));
    await describeMode("signalfejl ved flintholm");
    await click("Foreslå scenarie");
    expect(container.textContent).toContain("Eksempel");
    expect(container.textContent).toContain("Signalfejl Vanløse");
  });

  it("shows the examples' no-candidate state when nothing matches", async () => {
    fetchMock.mockRejectedValue(new ApiError("not found", 404));
    await describeMode("ingenting passer");
    await click("Foreslå scenarie");
    expect(container.textContent).toContain("Ingen sikre forslag");
  });

  it("shows an error with a way to the list for any other failure", async () => {
    fetchMock.mockRejectedValue(new ApiError("boom", 500));
    await describeMode("signalfejl");
    await click("Foreslå scenarie");
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("Kunne ikke hente forslag");
    expect(alert.textContent).toContain("vælg selv i listen");
  });

  it("ignores an answer for text that was edited while it ran", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchSuggestions>>) => void;
    fetchMock.mockReturnValue(new Promise((yes) => (resolve = yes)));
    await describeMode("signalfejl");
    await click("Foreslå scenarie");
    expect(container.textContent).toContain("Finder forslag");
    await type("noget andet");
    await act(async () =>
      resolve({
        status: "CONFIDENT",
        candidates: [{ scenarioId: "S1", score: 0.9 }],
      }),
    );
    expect(container.textContent).not.toContain("90 %");
  });

  it("toggles a quick pick as a whole word and clears everything", async () => {
    await describeMode("signalfejl ved forum");
    expect(button("Signalfejl").getAttribute("aria-pressed")).toBe("true");
    await click("Signalfejl");
    expect(field().value).toBe("ved forum");
    await click("Togstop");
    expect(field().value).toBe("ved forum, togstop");
    // "togstoppet" is another word: it does not press the chip.
    await type("togstoppet");
    expect(button("Togstop").getAttribute("aria-pressed")).toBe("false");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label^="Ryd"]')!
        .click(),
    );
    expect(field().value).toBe("");
  });
});
