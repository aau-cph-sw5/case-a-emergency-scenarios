import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_VIEWBOX } from "../../../shared/mapViewBox";

export type Box = { x: number; y: number; w: number; h: number };

const MAX_ZOOM = 10;
// Largest single zoom step. It stops one huge wheel delta (exp overflows to
// Infinity) from turning the box into NaN.
const MAX_STEP = 1e3;

export function parseViewBox(viewBox: string): Box {
  const [x, y, w, h] = viewBox.trim().split(/\s+/).map(Number);
  const ok = [x, y, w, h].every(Number.isFinite) && w > 0 && h > 0;
  return ok ? { x, y, w, h } : parseViewBox(DEFAULT_VIEWBOX);
}

// At most MAX_ZOOM times in and no further out than `base`, and the map stays
// within half a screen of where it started.
export function clampBox(base: Box, next: Box): Box {
  const w = Math.min(base.w, Math.max(base.w / MAX_ZOOM, next.w));
  if (w >= base.w) return base;
  const h = (next.h / next.w) * w;
  const x = Math.min(
    base.x + base.w - w + base.w / 2,
    Math.max(base.x - base.w / 2, next.x),
  );
  const y = Math.min(
    base.y + base.h - h + base.h / 2,
    Math.max(base.y - base.h / 2, next.y),
  );
  return { x, y, w, h };
}

// Zooms `box` by `factor` (above 1 is out) keeping the map point (px, py) fixed.
export function zoomBox(
  base: Box,
  box: Box,
  point: { x: number; y: number },
  factor: number,
): Box {
  const k = Math.min(factor, MAX_STEP);
  return clampBox(base, {
    x: point.x - (point.x - box.x) * k,
    y: point.y - (point.y - box.y) * k,
    w: box.w * k,
    h: box.h * k,
  });
}

const same = (a: Box, b: Box) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

type Point = { x: number; y: number };

// A press that moved less than this many pixels is still a click.
const DRAG_THRESHOLD = 3;

// A mouse that left the map with the button down never sent pointerup.
const isStaleMouse = (event: React.PointerEvent) =>
  event.pointerType === "mouse" && event.buttons === 0;

const isJitter = (from: Point, to: Point, pointerCount: number) => {
  const tiny = Math.hypot(to.x - from.x, to.y - from.y) < DRAG_THRESHOLD;
  return tiny && pointerCount < 2;
};

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) || 1;

// Zoom factor (above 1 is out), new centre and how far the centre moved.
function pinchStep([a1, a2]: Point[], [c1, c2]: Point[]) {
  const centre = midpoint(c1, c2);
  const was = midpoint(a1, a2);
  return {
    centre,
    factor: distance(a1, a2) / distance(c1, c2),
    shift: { x: centre.x - was.x, y: centre.y - was.y },
  };
}

// Moves the box against a drag of `shift` screen pixels.
const panBox = (box: Box, shift: Point, scale: number): Box => ({
  ...box,
  x: box.x - shift.x / scale,
  y: box.y - shift.y / scale,
});

// Lets the operator zoom the map with the scroll wheel or a trackpad pinch,
// pinch with two fingers on a touch screen, and drag to move it. It only
// changes the viewBox it hands to its child; it starts again from the given
// viewBox whenever that changes (another scenario, or the Zoom ind/ud button).
export function ZoomFrame({
  viewBox,
  children,
}: {
  viewBox: string | undefined;
  children: (viewBox: string) => ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState<{ base: string; box: Box } | null>(null);
  const startKey = viewBox ?? DEFAULT_VIEWBOX;
  const base = useMemo(() => parseViewBox(startKey), [startKey]);
  // Another viewBox starts again, also when the old one comes back later.
  if (custom && custom.base !== startKey) setCustom(null);
  const box = custom?.base === startKey ? custom.box : base;
  // The latest values for the event handlers, which are set up once. Synced
  // after each render and updated at once by apply().
  const currentRef = useRef({ box, base, key: startKey });
  // Layout effect: runs before any event can see a stale box.
  useLayoutEffect(() => {
    currentRef.current = { box, base, key: startKey };
  });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const movedRef = useRef(false);
  const scaleRef = useRef(1);

  // Pixels of the frame to units of the viewBox ("meet": the map is centred).
  const toMap = useCallback((px: number, py: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return { x: px, y: py, scale: 1 };
    const { box: b } = currentRef.current;
    const scale = Math.min(rect.width / b.w, rect.height / b.h) || 1;
    const x0 = (rect.width - b.w * scale) / 2;
    const y0 = (rect.height - b.h * scale) / 2;
    return {
      x: b.x + (px - rect.left - x0) / scale,
      y: b.y + (py - rect.top - y0) / scale,
      scale,
    };
  }, []);

  const apply = useCallback((next: Box) => {
    const { base: o, key } = currentRef.current;
    const box = clampBox(o, next);
    currentRef.current.box = box;
    setCustom({ base: key, box });
  }, []);

  // Zooms around a point of the frame. False when nothing changed (at a limit).
  const zoomAt = useCallback(
    (px: number, py: number, factor: number) => {
      const { box: b, base: o } = currentRef.current;
      const next = zoomBox(o, b, toMap(px, py), factor);
      if (same(next, b)) return false;
      apply(next);
      return true;
    },
    [toMap, apply],
  );

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    // Not passive, so the page does not scroll while the map zooms; but only
    // stop the page when the map actually zoomed.
    const onWheel = (event: WheelEvent) => {
      // A trackpad pinch arrives as a wheel with ctrlKey and small steps.
      const speed = event.ctrlKey ? 0.01 : 0.0015;
      // Line mode (Firefox, some mice) counts lines, not pixels.
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      if (zoomAt(event.clientX, event.clientY, Math.exp(delta * speed)))
        event.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function onPointerDown(event: React.PointerEvent) {
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    movedRef.current = false;
    scaleRef.current = toMap(0, 0).scale;
  }

  function capturePointer(pointerId: number) {
    const el = frameRef.current;
    if (el && !el.hasPointerCapture?.(pointerId))
      el.setPointerCapture?.(pointerId);
  }

  // Pinch: zoom around the middle of the two fingers and follow it.
  function pinch(before: Point[], after: Point[]) {
    const { centre, factor, shift } = pinchStep(before, after);
    zoomAt(centre.x, centre.y, factor);
    // The zoom changed the scale, so read it again for the pan step.
    scaleRef.current = toMap(0, 0).scale;
    apply(panBox(currentRef.current.box, shift, scaleRef.current));
  }

  function onPointerMove(event: React.PointerEvent) {
    const known = pointersRef.current.get(event.pointerId);
    if (!known) return;
    if (isStaleMouse(event)) {
      pointersRef.current.delete(event.pointerId);
      return;
    }
    const before = [...pointersRef.current.values()];
    const current = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, current);
    const after = [...pointersRef.current.values()];
    if (!movedRef.current && isJitter(known, current, after.length)) return;
    movedRef.current = true;
    capturePointer(event.pointerId);
    if (after.length >= 2) return pinch(before, after);
    const shift = { x: current.x - known.x, y: current.y - known.y };
    apply(panBox(currentRef.current.box, shift, scaleRef.current));
  }

  function onPointerEnd(event: React.PointerEvent) {
    pointersRef.current.delete(event.pointerId);
    const el = frameRef.current;
    if (el?.hasPointerCapture?.(event.pointerId))
      el.releasePointerCapture(event.pointerId);
    // The finger left behind keeps its own position, so it pans from here.
    scaleRef.current = toMap(0, 0).scale;
    // The click of this drag comes right after; a later keyboard click must not
    // be taken for it.
    if (pointersRef.current.size === 0)
      setTimeout(() => (movedRef.current = false), 0);
  }

  // A drag is not a click on whatever the map shows under the finger.
  function onClickCapture(event: React.MouseEvent) {
    if (!movedRef.current) return;
    movedRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return (
    <div
      ref={frameRef}
      className="operator-map-renderer"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
    >
      {children(`${box.x} ${box.y} ${box.w} ${box.h}`)}
    </div>
  );
}
