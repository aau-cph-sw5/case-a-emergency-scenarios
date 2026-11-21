import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  TaskPicker,
  WeekdaySelect,
  TimePicker,
  validStaffingDays,
} from "../../web/src/components/ScenarioStaffingControls";

jest.mock("../../web/src/components/ScenarioStaffingControls.css", () => ({}));

describe("staffing controls", () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const button = (text: string) =>
    [...container.querySelectorAll("button")].find((el) =>
      el.textContent?.includes(text),
    )!;
  async function enter(label: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(
      `input[aria-label="${label}"]`,
    )!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("adds multiple suggested tasks and allows custom text", async () => {
    const onAdd = jest.fn<(instructions: string[]) => void>();
    await act(async () =>
      root.render(
        <TaskPicker
          station="VAN"
          tasks={[{ instruction: "Tag gul vest på" }]}
          onAdd={onAdd}
        />,
      ),
    );
    await act(async () => button("Tilføj opgave").click());
    const disabled = [...container.querySelectorAll("label")]
      .find((el) => el.textContent?.includes("Tag gul vest på"))!
      .querySelector("input")!;
    expect(disabled.disabled).toBe(true);
    const option = [...container.querySelectorAll("label")]
      .find((el) => el.textContent?.includes("Rulletrapper skal standses"))!
      .querySelector("input")!;
    await act(async () => option.click());
    const custom = container.querySelector<HTMLInputElement>(
      'input[placeholder^="F.eks."]',
    )!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(custom, "Hjælp rejsende");
      custom.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => button("Tilføj valgte opgaver").click());
    expect(onAdd).toHaveBeenCalledWith([
      "Rulletrapper skal standses, når perronen bliver for fyldt",
      "Hjælp rejsende",
    ]);
    await act(async () => button("Tilføj opgave").click());
    await act(async () => button("Annuller").click());
    expect(container.textContent).not.toContain("Skriv en opgave");
  });
  it("selects weekdays and checks valid ranges", async () => {
    const onChange = jest.fn<(value: string) => void>();
    await act(async () =>
      root.render(
        <WeekdaySelect
          label="Fra dag"
          fieldLabel="Fra dag"
          value="man"
          onChange={onChange}
        />,
      ),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Fra dag"]')!
        .click(),
    );
    await act(async () => button("Torsdag").click());
    expect(onChange).toHaveBeenCalledWith("tor");
    expect(validStaffingDays("man–tor")).toBe(true);
    expect(validStaffingDays("man–invalid")).toBe(false);
    expect(validStaffingDays("man–tor–fre")).toBe(false);
  });
  it("navigates weekdays using the keyboard", async () => {
    const onChange = jest.fn<(value: string) => void>();
    await act(async () =>
      root.render(
        <WeekdaySelect
          label="Dag"
          fieldLabel="Dag"
          value="man"
          onChange={onChange}
        />,
      ),
    );
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Dag"]',
    )!;
    await act(async () =>
      trigger.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      ),
    );
    const menu = container.querySelector('[aria-label="Dag: vælg dag"]')!;
    await act(async () =>
      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      ),
    );
    expect(document.activeElement?.textContent).toContain("Tirsdag");
    await act(async () =>
      menu.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
  it("replaces and deletes digits while keeping the time separator", async () => {
    function Form() {
      const [value, setValue] = useState("12:00");
      return <TimePicker label="Tid" value={value} onChange={setValue} />;
    }
    await act(async () => root.render(<Form />));
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Tid"]',
    )!;
    await act(async () => input.focus());
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "1", bubbles: true }),
      ),
    );
    expect(input.value).toBe("1");
    await enter("Tid", "1430");
    input.setSelectionRange(3, 3);
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }),
      ),
    );
    expect(input.value).toBe("13:0");
    await act(async () =>
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(container.textContent).not.toContain("Vælg time");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('button[aria-label="Vælg Tid"]')!
        .click(),
    );
    expect(container.textContent).toContain("Vælg time");
    const hours = container.querySelector('[aria-label="Timer: Tid"]')!;
    await act(async () =>
      [...hours.querySelectorAll("button")]
        .find((b) => b.textContent === "07")!
        .click(),
    );
    await act(async () => button("Time 07").click());
    expect(container.textContent).toContain("Vælg time");
  });
  it("selects hours then quarter hours and formats typed times", async () => {
    function Form() {
      const [value, setValue] = useState("12:00");
      return <TimePicker label="Fra" value={value} onChange={setValue} />;
    }
    await act(async () => root.render(<Form />));
    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Fra"]',
    )!;
    await act(async () => input.focus());
    expect(container.textContent).toContain("Vælg time");
    const hours = container.querySelector('[aria-label="Timer: Fra"]')!;
    await act(async () =>
      [...hours.querySelectorAll("button")]
        .find((b) => b.textContent === "07")!
        .click(),
    );
    expect(container.textContent).toContain("Vælg minutter");
    const minutes = container.querySelector('[aria-label="Minutter: Fra"]')!;
    await act(async () =>
      [...minutes.querySelectorAll("button")]
        .find((b) => b.textContent === "30")!
        .click(),
    );
    expect(input.value).toBe("07:30");
    await enter("Fra", "1430");
    expect(input.value).toBe("14:30");
  });
});
