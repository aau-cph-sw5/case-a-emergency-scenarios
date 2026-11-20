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
import { ScenarioSuggestions } from "../../web/src/ScenarioSuggestions";
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

const onSelect = jest.fn<(id: string) => void>();
const onNoCandidate = jest.fn<() => void>();
const onGoToList = jest.fn<() => void>();
let container: HTMLDivElement;
let root: Root;

async function renderBox(disabled = false) {
  await act(async () => {
    root.render(
      <ScenarioSuggestions
        token="operator-token"
        scenarios={scenarios}
        selectedId={null}
        onSelect={onSelect}
        onNoCandidate={onNoCandidate}
        onGoToList={onGoToList}
        disabled={disabled}
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

async function openBox(text = "") {
  await renderBox();
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

describe("scenario suggestions", () => {
  it("shows ranked suggestions with the route and matched stations, and only selects", async () => {
    fetchMock.mockResolvedValue({
      status: "CONFIDENT",
      candidates: [{ scenarioId: "S1", score: 0.87 }],
    });
    await openBox("signalfejl ved vanløse");
    await click("Foreslå scenarie");
    expect(fetchMock).toHaveBeenCalledWith(
      "operator-token",
      "signalfejl ved vanløse",
      expect.any(AbortSignal),
    );
    expect(container.textContent).toContain("87 %");
    expect(container.textContent).toContain("Frederiksberg ↔ Vanløse");
    expect(container.textContent).toContain("1 forslag fundet.");
    await click(/Signalfejl Vanløse/);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("S1");
  });

  it("tells the operator when no candidate is confident and offers the list", async () => {
    fetchMock.mockResolvedValue({ status: "NO_CONFIDENT_CANDIDATE" });
    await openBox("noget helt andet");
    await click("Foreslå scenarie");
    expect(container.textContent).toContain("Ingen sikre forslag");
    expect(onNoCandidate).toHaveBeenCalledTimes(1);
    await click("Gå til listen");
    expect(onGoToList).toHaveBeenCalledTimes(1);
  });

  it("asks for a description before sending anything", async () => {
    await openBox();
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
    await openBox("signalfejl");
    await press("Enter", true);
    expect(fetchMock).not.toHaveBeenCalled();
    await press("Enter");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is disabled while the parent is busy", async () => {
    await renderBox(true);
    expect(button("Foreslå scenarie").disabled).toBe(true);
  });

  it("says suggestions are not available yet while the endpoint answers 404", async () => {
    fetchMock.mockRejectedValue(new ApiError("not found", 404));
    await openBox("signalfejl ved flintholm");
    await click("Foreslå scenarie");
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("Forslag er ikke tilgængelige endnu.");
    expect(alert.textContent).toContain("vælg selv i listen");
    expect(container.textContent).not.toContain("Eksempel");
  });

  it("shows an error with a way to the list for any other failure", async () => {
    fetchMock.mockRejectedValue(new ApiError("boom", 500));
    await openBox("signalfejl");
    await click("Foreslå scenarie");
    const alert = container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("Kunne ikke hente forslag");
    expect(alert.textContent).toContain("vælg selv i listen");
  });

  it("ignores an answer for text that was edited while it ran", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof fetchSuggestions>>) => void;
    fetchMock.mockReturnValue(new Promise((yes) => (resolve = yes)));
    await openBox("signalfejl");
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
    await openBox("signalfejl ved forum");
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

  it("turning a quick pick off removes only that word, never the rest of the text", async () => {
    const text = "Signalfejl ved Forum ... Nørreport\nPassagerer melder røg";
    await openBox(text);
    await click("Signalfejl");
    expect(field().value).toBe(
      "ved Forum ... Nørreport\nPassagerer melder røg",
    );
    await type("Ved Forum, signalfejl, Nørreport");
    await click("Signalfejl");
    expect(field().value).toBe("Ved Forum, Nørreport");
    await type("Strømsvigt ved KN");
    await click("Strømsvigt");
    await click("Strømsvigt");
    expect(field().value).toBe("ved KN, strømsvigt");
  });

  it("scrolls the answer into view, so the operator sees that results came back", async () => {
    const scrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    fetchMock.mockResolvedValue({
      status: "CONFIDENT",
      candidates: [{ scenarioId: "S1", score: 0.87 }],
    });
    await openBox("signalfejl ved vanløse");
    expect(scrollIntoView).not.toHaveBeenCalled();
    await click("Foreslå scenarie");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      container.querySelector(".suggest-answer"),
    );
  });
});
