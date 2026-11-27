import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, jest } from "@jest/globals";
import {
  ZoomFrame,
  clampBox,
  parseViewBox,
  zoomBox,
} from "../../web/src/components/ZoomFrame";

const base = { x: 0, y: 0, w: 100, h: 100 };

it("falls back to the default viewBox when it is malformed", () => {
  expect(parseViewBox("1 2 3 4")).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  expect(parseViewBox("a b c d")).toEqual({ x: 0, y: 0, w: 950, h: 700 });
  expect(parseViewBox("0 0 0 5")).toEqual({ x: 0, y: 0, w: 950, h: 700 });
});

it("clamps zoom between the start and 10 times in", () => {
  expect(clampBox(base, { x: 0, y: 0, w: 500, h: 500 })).toBe(base);
  expect(clampBox(base, { x: 0, y: 0, w: 1, h: 1 }).w).toBe(10);
  // Pan stays within half a screen of the start.
  expect(clampBox(base, { x: -999, y: 999, w: 50, h: 50 })).toEqual({
    x: -50,
    y: 100,
    w: 50,
    h: 50,
  });
});

it("zooms around a point and never produces NaN", () => {
  const box = zoomBox(base, base, { x: 0, y: 0 }, 0.5);
  expect(box).toEqual({ x: 0, y: 0, w: 50, h: 50 });
  const huge = zoomBox(base, box, { x: 10, y: 10 }, Infinity);
  expect(Number.isFinite(huge.x + huge.y + huge.w + huge.h)).toBe(true);
});

function setup() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onClick = jest.fn();
  const seen: string[] = [];
  const render = () =>
    act(async () =>
      root.render(
        <ZoomFrame viewBox="0 0 100 100">
          {(vb) => {
            seen.push(vb);
            return (
              <button type="button" onClick={onClick}>
                x
              </button>
            );
          }}
        </ZoomFrame>,
      ),
    );
  return { container, root, onClick, seen, render };
}

function pointer(
  type: string,
  el: Element,
  { x, y, buttons = 1 }: { x: number; y: number; buttons?: number },
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    buttons,
  });
  Object.defineProperty(event, "pointerId", { value: 1 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  return act(async () => {
    el.dispatchEvent(event);
  });
}

it("hands the viewBox to its child and zooms with the wheel", async () => {
  const { container, root, seen, render } = setup();
  await render();
  const frame = container.firstElementChild as HTMLElement;
  frame.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  expect(seen.at(-1)).toBe("0 0 100 100");
  // Out at the start: nothing changes, so the page may scroll.
  const out = new WheelEvent("wheel", { deltaY: 100, cancelable: true });
  await act(async () => {
    frame.dispatchEvent(out);
  });
  expect(out.defaultPrevented).toBe(false);
  const zoomIn = new WheelEvent("wheel", {
    deltaY: -500,
    clientX: 50,
    clientY: 50,
    cancelable: true,
  });
  await act(async () => {
    frame.dispatchEvent(zoomIn);
  });
  expect(zoomIn.defaultPrevented).toBe(true);
  expect(Number(seen.at(-1)?.split(" ")[2])).toBeLessThan(100);
  await act(async () => root.unmount());
});

it("ignores a mouse move without a button after a zoom", async () => {
  const { container, root, seen, render } = setup();
  await render();
  const frame = container.firstElementChild as HTMLElement;
  frame.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  await act(async () => {
    frame.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -500,
        clientX: 50,
        clientY: 50,
        cancelable: true,
      }),
    );
  });
  const zoomed = seen.at(-1);
  expect(zoomed).not.toBe("0 0 100 100");
  await pointer("pointerdown", frame, { x: 10, y: 10 });
  await pointer("pointermove", frame, { x: 60, y: 60, buttons: 0 });
  expect(seen.at(-1)).toBe(zoomed);
  await act(async () => root.unmount());
});

it("does not click a child after a drag", async () => {
  jest.useFakeTimers();
  const { container, root, onClick, render } = setup();
  await render();
  const frame = container.firstElementChild as HTMLElement;
  const button = container.querySelector("button") as HTMLButtonElement;
  await pointer("pointerdown", button, { x: 10, y: 10 });
  await pointer("pointermove", button, { x: 40, y: 40 });
  await pointer("pointerup", button, { x: 40, y: 40 });
  // The click of the drag comes before the reset timer fires.
  await act(async () => button.click());
  expect(onClick).not.toHaveBeenCalled();
  await act(async () => {
    jest.runAllTimers();
  });
  jest.useRealTimers();
  // A plain press afterwards is a click again.
  await pointer("pointerdown", frame, { x: 10, y: 10 });
  await pointer("pointerup", frame, { x: 10, y: 10 });
  await act(async () => button.click());
  expect(onClick).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});
