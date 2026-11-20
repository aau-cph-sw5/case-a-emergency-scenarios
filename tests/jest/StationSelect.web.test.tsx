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
import { StationSelect } from "../../web/src/components/StationSelect";

jest.mock("../../web/src/components/StationSelect.css", () => ({}));

describe("StationSelect", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onChange = jest.fn<(station: string) => void>();
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    onChange.mockClear();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  async function show(value = "") {
    await act(async () =>
      root.render(
        <StationSelect
          label="Fra station"
          value={value}
          stations={["VAN", "FL", "LIT"]}
          stationNames={{ VAN: "Vanløse" }}
          onChange={onChange}
        />,
      ),
    );
  }
  const trigger = () =>
    container.querySelector<HTMLButtonElement>(
      'button[aria-label="Fra station"]',
    )!;
  const search = () =>
    container.querySelector<HTMLInputElement>(
      'input[aria-label="Søg fra station"]',
    )!;
  async function searchFor(value: string) {
    const input = search();
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("searches station codes and selects a result", async () => {
    await show();
    expect(trigger().textContent).toContain("Vælg station");
    await act(async () => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(
      container
        .querySelector('button[aria-label="Vælg VAN"]')
        ?.getAttribute("title"),
    ).toBe("Vanløse");
    await searchFor("li");
    expect(container.querySelector('button[aria-label="Vælg VAN"]')).toBeNull();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Vælg LIT"]')!
        .click(),
    );
    expect(onChange).toHaveBeenCalledWith("LIT");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
  it("keeps search focus while clicking an option or closing the menu", async () => {
    await show();
    await act(async () => trigger().click());
    const input = search();
    expect(document.activeElement).toBe(input);
    const option = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Vælg FL"]',
    )!;
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      option.dispatchEvent(down);
      option.click();
    });
    expect(down.defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenCalledWith("FL");
    await act(async () => trigger().click());
    const triggerDown = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      trigger().dispatchEvent(triggerDown);
      trigger().click();
    });
    expect(triggerDown.defaultPrevented).toBe(true);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
  it("supports keyboard selection, empty results and closing", async () => {
    await show("VAN");
    expect(trigger().getAttribute("title")).toBe("Vanløse");
    await act(async () => trigger().click());
    expect(
      container
        .querySelector('button[aria-label="Vælg VAN"]')
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    await searchFor("none");
    expect(container.textContent).toContain("Ingen stationer fundet");
    await searchFor("fl");
    await act(async () =>
      search().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
    );
    expect(onChange).toHaveBeenCalledWith("FL");
    await act(async () => trigger().click());
    await act(async () =>
      search().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    await act(async () => trigger().click());
    expect(search().value).toBe("");
    await act(async () => trigger().click());
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
