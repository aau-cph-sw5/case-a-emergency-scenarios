import { Fragment, useState, type ReactNode } from "react";
import { View, Pressable, Text as RNText } from "react-native";
import Svg, { Text, Line, Circle, Path, G } from "react-native-svg";
import { getCrossovers, getLines, getStation } from "../mockData/data";
import { text, radius, colors as theme, coverageColors } from "./Theme";
import type { CoverageLevel } from "./components/stationState";
import { connectionKey } from "./network/network";

type MapLine = {
  name: string;
  tracks: number[];
  connections: [string, string][];
  connectionTracks?: Record<string, number[]>;
};

type BlockedTrack = {
  trackNumber: number;
  stationA: string;
  stationB: string;
};

export type MapCrossover = {
  stationA: string;
  stationB: string;
  color: string;
};

function GetOffset(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  offset: number,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length === 0) return { ox: 0, oy: 0 };

  return { ox: (-dy / length) * offset, oy: (dx / length) * offset };
}

// Keep the two track directions separate while smoothing the Cityringen.
// The shared M3/M4 sections use the same geometry in either line view.
const defaultRingStations = getLines()
  .find((line) => line.name === "M3")!
  .connections.map(([station]) => station);

function circularRing(
  stations: string[],
  position: (station: string) => [number, number] | undefined,
) {
  if (stations.length < 3) return null;
  const points = stations.map(position);
  if (points.some((point) => !point)) return null;
  const [a, b, c] = [
    points[0]!,
    points[Math.floor(points.length / 3)]!,
    points[Math.floor((2 * points.length) / 3)]!,
  ];
  const determinant =
    2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(determinant) < 0.000001) return null;
  const square = ([x, y]: [number, number]) => x * x + y * y;
  const x =
    (square(a) * (b[1] - c[1]) +
      square(b) * (c[1] - a[1]) +
      square(c) * (a[1] - b[1])) /
    determinant;
  const y =
    (square(a) * (c[0] - b[0]) +
      square(b) * (a[0] - c[0]) +
      square(c) * (b[0] - a[0])) /
    determinant;
  const r = Math.hypot(a[0] - x, a[1] - y);
  if (
    points.some(
      (point) =>
        Math.abs(Math.hypot(point![0] - x, point![1] - y) - r) >
        Math.max(0.05, r * 0.001),
    )
  )
    return null;
  return { x, y, r };
}

type RingCurve =
  | {
      kind: "arc";
      x: number;
      y: number;
      radius: number;
      start: number;
      delta: number;
    }
  | {
      kind: "curve";
      p1: readonly number[];
      p2: readonly number[];
      c1: number[];
      c2: number[];
    };

function ringCurve(
  stationA: string,
  stationB: string,
  offset: number,
  ringStations: string[],
  position: (station: string) => [number, number] | undefined,
): RingCurve | null {
  const count = ringStations.length;
  const start = ringStations.indexOf(stationA);
  if (start < 0) return null;
  if (ringStations[(start + 1) % count] !== stationB) {
    if (ringStations[(start - 1 + count) % count] === stationB)
      return ringCurve(stationB, stationA, -offset, ringStations, position);
    return null;
  }
  const circle = circularRing(ringStations, position);
  const a = position(stationA);
  const b = position(stationB);
  if (circle && a && b) {
    const cross =
      (a[0] - circle.x) * (b[1] - circle.y) -
      (a[1] - circle.y) * (b[0] - circle.x);
    const start = Math.atan2(a[1] - circle.y, a[0] - circle.x);
    const end = Math.atan2(b[1] - circle.y, b[0] - circle.x);
    let delta = end - start;
    if (cross > 0 && delta < 0) delta += 2 * Math.PI;
    if (cross < 0 && delta > 0) delta -= 2 * Math.PI;
    return {
      kind: "arc",
      x: circle.x,
      y: circle.y,
      radius: circle.r + (cross > 0 ? -offset : offset),
      start,
      delta,
    };
  }
  const shifted = (index: number) => {
    const point = position(ringStations[(index + count) % count]);
    const previous = position(ringStations[(index - 1 + count) % count]);
    const next = position(ringStations[(index + 1) % count]);
    if (!point || !previous || !next) return undefined;
    const { ox, oy } = GetOffset(...previous, ...next, offset);
    return [point[0] + ox, point[1] + oy] as const;
  };
  const p0 = shifted(start - 1);
  const p1 = shifted(start);
  const p2 = shifted(start + 1);
  const p3 = shifted(start + 2);
  if (!p0 || !p1 || !p2 || !p3) return null;
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return { kind: "curve", p1, p2, c1, c2 };
}

function ringPath(
  stationA: string,
  stationB: string,
  offset: number,
  ringStations: string[],
  position: (station: string) => [number, number] | undefined,
) {
  const curve = ringCurve(stationA, stationB, offset, ringStations, position);
  if (!curve) return null;
  if (curve.kind === "arc") {
    const [x1, y1] = curvePoint(curve, 0);
    const [x2, y2] = curvePoint(curve, 1);
    return `M ${x1} ${y1} A ${curve.radius} ${curve.radius} 0 0 ${curve.delta > 0 ? 1 : 0} ${x2} ${y2}`;
  }
  const { p1, p2, c1, c2 } = curve;
  return `M ${p1[0]} ${p1[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
}

function curvePoint(curve: RingCurve, t: number): [number, number] {
  if (curve.kind === "arc") {
    const angle = curve.start + t * curve.delta;
    return [
      curve.x + curve.radius * Math.cos(angle),
      curve.y + curve.radius * Math.sin(angle),
    ];
  }
  const s = 1 - t;
  const axis = (index: number) =>
    s ** 3 * curve.p1[index] +
    3 * s ** 2 * t * curve.c1[index] +
    3 * s * t ** 2 * curve.c2[index] +
    t ** 3 * curve.p2[index];
  return [axis(0), axis(1)];
}

const defaultCrossovers: MapCrossover[] = getCrossovers().map(
  ({ between: [stationA, stationB] }) => ({
    stationA,
    stationB,
    color: "#252a2c",
  }),
);

const LABEL_ABOVE_LEFT = ["NHT", "ORK", "AMH", "NUK", "NØR", "NØ", "SKP"];
// These shared M3/M4 stations sit beside a diagonal route; their labels fit
// inside the ring instead of following the tracks.
const LABEL_INSIDE_RING = ["KK"];
const LABEL_BELOW_RIGHT = ["GLS", "HOL", "EBR", "SLU", "MOP", "NEL"];
const LABEL_BELOW_LEFT = ["FBA", "EHP"];
const LABEL_HORIZONTAL_RIGHT = ["ISB", "UNI", "KHS", "BC", "ØRE", "VEA"];

const BASE_STATION_RADIUS = 10;
const DOT_STROKE_WIDTH = 5;
const RING_GAP_WIDTH = 3;
const OUTER_RING_WIDTH = 3;
const LABEL_GAP = 6;
const BASE_OUTER_RING_EDGE =
  BASE_STATION_RADIUS +
  DOT_STROKE_WIDTH / 2 +
  RING_GAP_WIDTH +
  OUTER_RING_WIDTH;

type StationAppearance =
  | { kind: "plain" }
  | { kind: "highlight"; color: string }
  | { kind: "coverage"; colors: { fill: string; text: string }; own: boolean };

function Station({
  name,
  x,
  y,
  appearance,
  requiredStaffing,
  isStop = false,
  ringOnly = false,
  onPress,
}: {
  name: string;
  x: number;
  y: number;
  appearance: StationAppearance;
  requiredStaffing?: number;
  isStop?: boolean;
  ringOnly?: boolean;
  onPress?: (station: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const ownStationRing = appearance.kind === "coverage" && appearance.own;
  const dotRadius = hover ? BASE_STATION_RADIUS + 3 : BASE_STATION_RADIUS;
  const ringGapRadius = dotRadius + DOT_STROKE_WIDTH / 2 + RING_GAP_WIDTH / 2;
  const outerRingRadius =
    dotRadius + DOT_STROKE_WIDTH / 2 + RING_GAP_WIDTH + OUTER_RING_WIDTH / 2;
  const dotFill =
    appearance.kind === "coverage"
      ? appearance.colors.fill
      : appearance.kind === "highlight"
        ? appearance.color
        : theme.background;
  const staffingFill =
    appearance.kind === "coverage" ? appearance.colors.text : theme.text;
  const labelFill =
    appearance.kind === "highlight" ? appearance.color : theme.text;
  // Tilted and placed beside the dot, clear of the tracks. A track rising to
  // the right would lie along the usual label, so those stations mirror it.
  const mirrored =
    LABEL_ABOVE_LEFT.includes(name) || (ringOnly && name === "FB");
  const insideRing = LABEL_INSIDE_RING.includes(name);
  const outsideRight = ringOnly && name === "KGN";
  const horizontalRight = LABEL_HORIZONTAL_RIGHT.includes(name);
  const belowRight =
    LABEL_BELOW_RIGHT.includes(name) || (ringOnly && name === "RHP");
  const belowLeft = LABEL_BELOW_LEFT.includes(name);
  const labelOffset =
    (ownStationRing ? BASE_OUTER_RING_EDGE : BASE_STATION_RADIUS) + LABEL_GAP;
  const labelX =
    mirrored || insideRing || belowLeft
      ? x - labelOffset - (ringOnly && name === "FB" ? 7 : 0)
      : x + labelOffset;
  const labelY =
    insideRing || outsideRight || horizontalRight
      ? y + 5
      : belowRight || belowLeft
        ? y + 20
        : y - BASE_STATION_RADIUS - 2 - (name === "NØ" ? 5 : 0);
  return (
    <G>
      {ownStationRing && (
        <>
          <Circle
            testID={`own-station-gap-${name}`}
            cx={x}
            cy={y}
            r={ringGapRadius}
            fill="none"
            stroke={theme.background}
            strokeWidth={RING_GAP_WIDTH}
            pointerEvents="none"
          />
          <Circle
            testID={`own-station-ring-${name}`}
            cx={x}
            cy={y}
            r={outerRingRadius}
            fill="none"
            stroke={theme.text}
            strokeWidth={OUTER_RING_WIDTH}
            pointerEvents="none"
          />
        </>
      )}
      <Circle
        testID={`station-dot-${name}`}
        cx={x}
        cy={y}
        r={dotRadius}
        fill={dotFill}
        stroke={theme.text}
        strokeWidth={DOT_STROKE_WIDTH}
        onPress={onPress ? () => onPress(name) : undefined}
        accessibilityLabel={onPress ? `Vælg station ${name}` : undefined}
        {...({
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
        } as any)}
      />
      {isStop && requiredStaffing === undefined && (
        <Circle cx={x} cy={y} r={3} fill={theme.text} pointerEvents="none" />
      )}
      {requiredStaffing !== undefined && (
        <Text
          testID={`station-staffing-${name}`}
          x={x}
          y={y + 5}
          textAnchor="middle"
          fontSize={14}
          fontWeight="bold"
          fill={staffingFill}
        >
          {requiredStaffing}
        </Text>
      )}
      <Text
        {...text.mapLabel}
        testID={`station-label-${name}`}
        fontSize={16}
        fontWeight="700"
        x={labelX}
        y={labelY}
        textAnchor={mirrored || insideRing || belowLeft ? "end" : "start"}
        transform={`rotate(${insideRing || outsideRight || horizontalRight ? 0 : mirrored || belowRight ? 45 : -45} ${labelX} ${labelY})`}
        onPress={onPress ? () => onPress(name) : undefined}
        fill={labelFill}
      >
        {name}
      </Text>
    </G>
  );
}

function TrackSegment({
  stationA,
  stationB,
  x1,
  y1,
  x2,
  y2,
  track,
  colorA,
  colorB,
  blocked = false,
  ringStations,
  position,
}: {
  stationA: string;
  stationB: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  track: number;
  colorA: string;
  colorB: string;
  blocked?: boolean;
  ringStations: string[];
  position: (station: string) => [number, number] | undefined;
}) {
  const [hover, setHover] = useState(false);
  const w = hover ? 6 : 4;
  const strips: [number, string, number][] = [
    [4, blocked ? theme.blockedTrack : colorA, w],
    [8, blocked ? theme.blockedTrack : colorB, w],
  ];
  const side = track === 1 ? -1 : 1;
  const press = () => console.log(`Track ${track}: ${stationA} → ${stationB}`);
  return (
    <>
      {strips.map(([d, color, sw]) => {
        const { ox, oy } = GetOffset(x1, y1, x2, y2, side * d);
        const curve = ringPath(
          stationA,
          stationB,
          side * d,
          ringStations,
          position,
        );
        if (curve) {
          return (
            <Path
              key={d}
              d={curve}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeDasharray={blocked ? "10 6" : undefined}
              onPress={press}
              {...({
                onMouseEnter: () => setHover(true),
                onMouseLeave: () => setHover(false),
              } as any)}
            />
          );
        }
        return (
          <Line
            key={d}
            x1={x1 + ox}
            y1={y1 + oy}
            x2={x2 + ox}
            y2={y2 + oy}
            stroke={color}
            strokeWidth={sw}
            strokeDasharray={blocked ? "10 6" : undefined}
            onPress={press}
            {...({
              onMouseEnter: () => setHover(true),
              onMouseLeave: () => setHover(false),
            } as any)}
          />
        );
      })}
    </>
  );
}

function LineButtons({
  colors,
  hidden,
  setHidden,
  groups,
}: {
  colors: Record<string, string>;
  hidden: string[];
  setHidden: React.Dispatch<React.SetStateAction<string[]>>;
  groups?: readonly (readonly string[])[];
}) {
  if (groups) {
    return (
      <View
        testID="metro-line-controls"
        style={{
          position: "absolute",
          flexDirection: "row",
          zIndex: 1,
          gap: 4,
        }}
      >
        {groups.map((group) => {
          const enabled = group.every((line) => !hidden.includes(line));
          return (
            <Pressable
              key={group.join("-")}
              testID={`metro-line-group-${group.join("-")}`}
              accessibilityRole="button"
              accessibilityLabel={group.join(" / ")}
              accessibilityState={{ selected: enabled }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                padding: 3,
                borderWidth: 2,
                borderColor: theme.text,
                borderRadius: 10,
                backgroundColor: theme.background,
              }}
              onPress={() =>
                setHidden((previous) =>
                  group.every((line) => !previous.includes(line))
                    ? [...new Set([...previous, ...group])]
                    : previous.filter((line) => !group.includes(line)),
                )
              }
            >
              {group.map((line) => (
                <View
                  key={line}
                  testID="metro-line-badge"
                  style={{
                    width: 32,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 7,
                    backgroundColor: colors[line],
                    opacity: enabled ? 1 : 0.3,
                  }}
                >
                  <RNText
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: theme.text,
                    }}
                  >
                    {line}
                  </RNText>
                </View>
              ))}
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View
      testID="metro-line-controls"
      style={{ position: "absolute", flexDirection: "row", zIndex: 1 }}
    >
      {Object.keys(colors).map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={n}
          accessibilityState={{ selected: !hidden.includes(n) }}
          style={{
            backgroundColor: colors[n],
            opacity: hidden.includes(n) ? 0.3 : 1,
            padding: 8,
            margin: 4,
            borderRadius: radius,
          }}
          onPress={() =>
            setHidden((h) =>
              h.includes(n) ? h.filter((x: string) => x !== n) : [...h, n],
            )
          }
        >
          <RNText style={text.body}>{n}</RNText>
        </Pressable>
      ))}
    </View>
  );
}

function GetColors(
  visible: MapLine[],
  colors: Record<string, string>,
  stationA: string,
  stationB: string,
  track: number,
) {
  const found = visible
    .filter(
      (l) =>
        (
          l.connectionTracks?.[connectionKey(stationA, stationB)] ?? l.tracks
        ).includes(track) &&
        l.connections.some((c) => c.includes(stationA) && c.includes(stationB)),
    )
    .map((l) => colors[l.name]);
  return [found[0], found[1] ?? found[0]];
}

export default function MapRender({
  lines,
  colors,
  viewBox = "0 0 950 700",
  showLineButtons = true,
  renderLineButtons,
  lineGroups,
  highlightStation,
  highlightColor = theme.text,
  markedStations = [],
  stopStations = [],
  blockedTracks = [],
  initiallyHidden = [],
  requiredStaffing = {},
  stationCoverage = {},
  positions,
  stationPositions,
  ringStations = defaultRingStations,
  availableSegments,
  crossovers,
  onStationPress,
}: {
  lines: MapLine[];
  colors: Record<string, string>;
  viewBox?: string;
  showLineButtons?: boolean;
  // Web can place the existing controls in its panel header.
  renderLineButtons?: (buttons: ReactNode) => ReactNode;
  lineGroups?: readonly (readonly string[])[];
  // Optional: one station drawn filled. Leaving it out draws the
  // map exactly as before.
  highlightStation?: string;
  highlightColor?: string;
  // Optional: more stations drawn the same way, for example the stations a
  // scenario needs staff at (#183). Leaving it out draws the map as before.
  markedStations?: readonly string[];
  stopStations?: readonly string[];
  // Optional: the tracks a scenario blocks, drawn in their own style (#183).
  blockedTracks?: readonly BlockedTrack[];
  // Optional: lines that start switched off until their button is pressed.
  initiallyHidden?: string[];
  // Saved staffing requirements: the number drawn on each station.
  requiredStaffing?: Readonly<Record<string, number>>;
  // Optional: the live coverage per station, which colours its dot green,
  // yellow or red like the coverage cards (MET-A-011, #310). Leaving it out
  // draws the map as before.
  stationCoverage?: Readonly<Record<string, CoverageLevel>>;
  positions?: Readonly<Record<string, [number, number]>>;
  stationPositions?: Readonly<Record<string, [number, number]>>;
  ringStations?: string[];
  crossovers?: readonly MapCrossover[];
  onStationPress?: (station: string) => void;
  availableSegments?: readonly {
    trackNumber: number;
    stationA: string;
    stationB: string;
  }[];
}) {
  const position = (station: string) =>
    positions
      ? positions[station]
      : (stationPositions?.[station] ?? getStation(station));
  const displayedCrossovers =
    crossovers ?? (positions ? [] : defaultCrossovers);
  // Each station once, with highlightStation last so its outer ring sits above
  // neighbouring stations.
  const highlighted = [
    ...new Set(
      markedStations.filter((station) => station !== highlightStation),
    ),
    ...(highlightStation !== undefined ? [highlightStation] : []),
  ];
  const highlightedSet = new Set(highlighted);
  const [hidden, setHidden] = useState<string[]>(initiallyHidden);
  const visible = lines.filter((l) => !hidden.includes(l.name));
  const connections = new Map<string, [string, string]>();
  for (const line of visible) {
    for (const [a, b] of line.connections) {
      const key = connectionKey(a, b);
      if (!connections.has(key)) connections.set(key, [a, b]);
    }
  }

  const ringOnly =
    visible.some((line) => line.name === "M3" || line.name === "M4") &&
    !visible.some((line) => line.name === "M1" || line.name === "M2");
  const visibleStations = [
    ...new Set(
      visible.flatMap((line) =>
        line.connections.filter(([a, b]) => position(a) && position(b)).flat(),
      ),
    ),
  ];
  const orderedStations = [
    ...visibleStations.filter((station) => !highlightedSet.has(station)),
    ...highlighted,
  ].filter((station) => position(station) !== undefined);
  const stationAppearance = (station: string): StationAppearance => {
    if (!highlightedSet.has(station)) return { kind: "plain" };
    const level = stationCoverage[station];
    if (level) {
      return {
        kind: "coverage",
        colors: coverageColors[level],
        own: station === highlightStation,
      };
    }
    return { kind: "highlight", color: highlightColor };
  };
  const lineButtons = showLineButtons ? (
    <LineButtons
      colors={colors}
      hidden={hidden}
      setHidden={setHidden}
      groups={lineGroups}
    />
  ) : null;
  return (
    <View style={{ flex: 1 }}>
      {renderLineButtons ? renderLineButtons(lineButtons) : lineButtons}
      <Svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {[...connections.values()]
          // A station the map has no position for is skipped, not drawn at 0,0.
          .filter(
            ([stationA, stationB]) =>
              position(stationA) !== undefined &&
              position(stationB) !== undefined,
          )
          .map(([lineA, lineB]) => {
            // Give a physical segment the same orientation in every line view.
            const matching = availableSegments?.filter(
              (segment) =>
                (segment.stationA === lineA && segment.stationB === lineB) ||
                (segment.stationA === lineB && segment.stationB === lineA),
            );
            const reference =
              matching?.find((segment) => segment.trackNumber === 1) ??
              matching?.[0];
            const stationA = reference?.stationA ?? lineA;
            const stationB = reference?.stationB ?? lineB;
            const [x1, y1] = position(stationA)!;
            const [x2, y2] = position(stationB)!;
            const rails = [1, 2].map((t) =>
              GetColors(visible, colors, stationA, stationB, t),
            );

            return (
              <Fragment key={connectionKey(stationA, stationB)}>
                {rails.map(
                  ([colorA, colorB], i) =>
                    colorA &&
                    (!availableSegments ||
                      availableSegments.some(
                        (segment) =>
                          segment.trackNumber === i + 1 &&
                          ((segment.stationA === stationA &&
                            segment.stationB === stationB) ||
                            (segment.stationA === stationB &&
                              segment.stationB === stationA)),
                      )) && (
                      <TrackSegment
                        key={i}
                        {...{
                          stationA,
                          stationB,
                          x1,
                          y1,
                          x2,
                          y2,
                          colorA,
                          colorB,
                        }}
                        track={i + 1}
                        ringStations={ringStations}
                        position={position}
                        blocked={blockedTracks.some(
                          (blocked) =>
                            blocked.trackNumber === i + 1 &&
                            [stationA, stationB].includes(blocked.stationA) &&
                            [stationA, stationB].includes(blocked.stationB),
                        )}
                      />
                    ),
                )}
              </Fragment>
            );
          })}
        {displayedCrossovers.map(({ stationA, stationB, color }) => {
          const a = position(stationA);
          const b = position(stationB);
          const visibleSegment = visible.some((line) =>
            line.connections.some(
              ([first, second]) =>
                (first === stationA && second === stationB) ||
                (first === stationB && second === stationA),
            ),
          );
          if (!a || !b || !visibleSegment) return null;
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const length = Math.hypot(dx, dy);
          if (length === 0) return null;
          const delta = Math.min(12 / length, 0.28);
          const first = 0.5 - delta;
          const last = 0.5 + delta;
          const { ox, oy } = GetOffset(...a, ...b, 6);
          const negativeCurve =
            ringCurve(stationA, stationB, -6, ringStations, position) ??
            ringCurve(stationB, stationA, -6, ringStations, position);
          const positiveCurve =
            ringCurve(stationA, stationB, 6, ringStations, position) ??
            ringCurve(stationB, stationA, 6, ringStations, position);
          const point = (t: number, side: -1 | 1): [number, number] => {
            const curve = side === -1 ? negativeCurve : positiveCurve;
            return curve
              ? curvePoint(curve, t)
              : [a[0] + dx * t + side * ox, a[1] + dy * t + side * oy];
          };
          const [x1, y1] = point(first, -1);
          const [x2, y2] = point(last, 1);
          const [x3, y3] = point(first, 1);
          const [x4, y4] = point(last, -1);
          return (
            <G
              key={`${stationA}-${stationB}`}
              testID={`crossover-${stationA}-${stationB}`}
              accessibilityLabel={`Sporskifte mellem ${stationA} og ${stationB}`}
            >
              <Line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={3}
              />
              <Line
                x1={x3}
                y1={y3}
                x2={x4}
                y2={y4}
                stroke={color}
                strokeWidth={3}
              />
            </G>
          );
        })}
        {/* Stations and labels sit above every track, including shared lines. */}
        {orderedStations.map((station) => {
          const isHighlighted = highlightedSet.has(station);
          const [x, y] = position(station)!;
          return (
            <Station
              key={station}
              name={station}
              x={x}
              y={y}
              appearance={stationAppearance(station)}
              requiredStaffing={
                isHighlighted ? requiredStaffing[station] : undefined
              }
              isStop={stopStations.includes(station)}
              ringOnly={ringOnly}
              onPress={onStationPress}
            />
          );
        })}
      </Svg>
    </View>
  );
}
