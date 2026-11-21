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
import { ScenarioLineSidebar } from "../../web/src/components/ScenarioLineSidebar";
import type { Route } from "../../web/src/admin-routes";

describe("scenario line sidebar", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onGroup = jest.fn<() => void>(),
    onCreate = jest.fn<() => void>(),
    onNext = jest.fn<() => void>(),
    onEdit = jest.fn<(route: Route) => void>(),
    onRemove = jest.fn<(id: number) => void>(),
    setScenarioId = jest.fn<(v: string) => void>(),
    setScenarioName = jest.fn<(v: string) => void>();
  const route: Route = {
    id: 1,
    from: "VAN",
    to: "FL",
    type: "PENDULUM",
    track: 1,
    did: "D",
    color: "#ff0000",
    maximumTrains: 2,
    stations: ["VAN", "FL"],
  };
  async function show(editingLine = false, routes: Route[] = [route]) {
    await act(async () =>
      root.render(
        <ScenarioLineSidebar
          lineGroup="M1/M2"
          scenarioId="S"
          setScenarioId={setScenarioId}
          scenarioName="Test"
          setScenarioName={setScenarioName}
          routes={routes}
          editingLine={editingLine}
          onGroup={onGroup}
          onCreate={onCreate}
          onEdit={onEdit}
          onRemove={onRemove}
          onNext={onNext}
        />,
      ),
    );
  }
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
  const btn = (text: string) =>
    [...container.querySelectorAll("button")].find((x) =>
      x.textContent?.includes(text),
    )!;
  it("opens and removes existing lines and moves to staffing", async () => {
    await show();
    expect(container.textContent).toContain("Pendul · Spor 1");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Rediger linje VAN til FL"]',
        )!
        .click(),
    );
    expect(onEdit).toHaveBeenCalledWith(route);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Fjern linje VAN til FL"]',
        )!
        .click(),
    );
    expect(onRemove).toHaveBeenCalledWith(1);
    await act(async () => btn("Næste: bemanding").click());
    await act(async () => btn("Opret linje").click());
    await act(async () => btn("Vælg linjegruppe").click());
    expect(onNext).toHaveBeenCalled();
    expect(onCreate).toHaveBeenCalled();
    expect(onGroup).toHaveBeenCalled();
    const input = container.querySelector<HTMLInputElement>("input")!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    await act(async () => {
      setter.call(input, "NEW");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(setScenarioId).toHaveBeenCalledWith("NEW");
  });
  it("prevents conflicting actions while editing and shows empty state", async () => {
    await show(true);
    expect(btn("Opret linje").disabled).toBe(true);
    expect(btn("Næste: bemanding").disabled).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Fjern linje VAN til FL"]',
      )?.disabled,
    ).toBe(true);
    await show(false, []);
    expect(container.textContent).toContain("Ingen linjer oprettet endnu");
    expect(btn("Næste: bemanding").disabled).toBe(true);
  });
});
