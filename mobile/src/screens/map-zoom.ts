// No react-native imports here (shared/Theme has them), so the unit tests can
// import this file.
import { getStation } from "../../../mockData/data";

// The whole network as MapRenderer draws it by default.
const MAP_WIDTH = 950;
const MAP_HEIGHT = 700;
// Station names are SVG text, so they do not follow the phone's font size by
// themselves. LABEL_SIZE is text.mapLabel.fontSize in shared/Theme; 12 is
// Android's smallest recommended text size.
const LABEL_SIZE = 18;
const MIN_LABEL_DP = 12;
const MARGIN = 40;

// MET-A-010: the part of the map to show in a box of boxWidth x boxHeight dp,
// zoomed in just enough that the station names are at least 12 dp times the
// phone's font scale. Centred on the affected stations, so the stretch stays
// in view together with its neighbours. Undefined (the whole map) when no
// station has a position or the box is not measured yet.
export function zoomedViewBox(
  stations: string[],
  boxWidth: number,
  boxHeight: number,
  fontScale: number,
  position: (station: string) => [number, number] | undefined = getStation,
): string | undefined {
  const positions = stations
    .map((station) => position(station))
    .filter((position) => position !== undefined);
  if (positions.length === 0 || boxWidth <= 0 || boxHeight <= 0) {
    return undefined;
  }
  const xs = positions.map((position) => position[0]);
  const ys = positions.map((position) => position[1]);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  // As wide as the labels allow, but never cutting off the stretch itself.
  const aspect = boxHeight / boxWidth;
  const legibleWidth = (boxWidth * LABEL_SIZE) / (MIN_LABEL_DP * fontScale);
  const width = Math.min(
    MAP_WIDTH,
    Math.max(
      legibleWidth,
      right - left + 2 * MARGIN,
      (bottom - top + 2 * MARGIN) / aspect,
    ),
  );
  const height = width * aspect;

  // Kept inside the map where it fits, so no empty space is shown.
  const fit = (start: number, size: number, max: number) =>
    size >= max ? (max - size) / 2 : Math.min(Math.max(start, 0), max - size);
  const x = fit((left + right) / 2 - width / 2, width, MAP_WIDTH);
  const y = fit((top + bottom) / 2 - height / 2, height, MAP_HEIGHT);

  // The size is rounded down, so rounding never makes the names smaller.
  const { round, floor } = Math;
  return `${round(x)} ${round(y)} ${floor(width)} ${floor(height)}`;
}

// Default width / height ratio of the full-screen map container before
// onLayout reports its measured size (portrait phone minus header and legend).
export const DEFAULT_OVERLAY_ASPECT = 3 / 4;

// Expands an SVG viewBox ("x y width height") around its centre to match the
// container's aspect ratio so the full area stays visible without clipping.
export function fitViewBoxToAspect(
  viewBox: string | undefined,
  width: number,
  height: number,
  fallbackAspect = DEFAULT_OVERLAY_ASPECT,
): string | undefined {
  if (viewBox === undefined) return undefined;
  const [x, y, w, h] = viewBox.split(" ").map(Number);
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0
  ) {
    return viewBox;
  }
  const aspect = width > 0 && height > 0 ? width / height : fallbackAspect;
  const current = w / h;
  let nextW = w;
  let nextH = h;
  if (current < aspect) {
    nextW = h * aspect;
  } else if (current > aspect) {
    nextH = w / aspect;
  }
  const nextX = x - (nextW - w) / 2;
  const nextY = y - (nextH - h) / 2;
  const { round } = Math;
  return `${round(nextX)} ${round(nextY)} ${round(nextW)} ${round(nextH)}`;
}
