import { Fragment, useState, type ReactNode } from "react";
import { View, Pressable, Text as RNText } from "react-native";
import Svg, { Text, Line, Circle, Path } from "react-native-svg";
import { getLines, getStation } from "../mockData/data";
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

function ringPath(
  stationA: string,
  stationB: string,
  offset: number,
  ringStations: string[],
  position: (station: string) => [number, number] | undefined,
) {
  const count = ringStations.length;
  const start = ringStations.indexOf(stationA);
  if (start < 0) return null;
  if (ringStations[(start + 1) % count] !== stationB) {
    if (ringStations[(start - 1 + count) % count] === stationB)
      return ringPath(stationB, stationA, -offset, ringStations, position);
    return null;
  }

  const circle = circularRing(ringStations, position);
  const a = position(stationA);
  const b = position(stationB);
  if (circle && a && b) {
    const cross =
      (a[0] - circle.x) * (b[1] - circle.y) -
      (a[1] - circle.y) * (b[0] - circle.x);
    const sweep = cross > 0 ? 1 : 0;
    const radius = circle.r + (sweep ? -offset : offset);
    const point = ([x, y]: [number, number]) => {
      const distance = Math.hypot(x - circle.x, y - circle.y);
      return [
        circle.x + ((x - circle.x) / distance) * radius,
        circle.y + ((y - circle.y) / distance) * radius,
      ];
    };
    const [x1, y1] = point(a);
    const [x2, y2] = point(b);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweep} ${x2} ${y2}`;
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
  return `M ${p1[0]} ${p1[1]} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
}

const LABEL_ABOVE_LEFT = ["NHT", "ORK", "AMH", "NUK", "NØR", "NØ", "SKP"];
// These shared M3/M4 stations sit beside a diagonal route; their labels fit
// inside the ring instead of following the tracks.
const LABEL_INSIDE_RING = ["KK"];
const LABEL_BELOW_RIGHT = ["GLS", "HOL", "EBR", "SLU", "MOP", "NEL"];
const LABEL_BELOW_LEFT = ["FBA", "EHP"];
const LABEL_HORIZONTAL_RIGHT = ["ISB", "UNI", "KHS", "BC", "ØRE", "VEA"];

function Station({
  name,
  x,
  y,
  highlightColor,
  requiredStaffing,
  ringOnly = false,
  coverage,
}: {
  name: string;
  x: number;
  y: number;
  // Set only for the station to highlight, e.g. the steward's own (MET-A-010).
  highlightColor?: string;
  requiredStaffing?: number;
  ringOnly?: boolean;
  // The live coverage fills the dot instead of the highlight (#310).
  coverage?: { fill: string; text: string };
}) {
  const [hover, setHover] = useState(false);
  const baseRadius = 10;
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
  const labelX =
    mirrored || insideRing || belowLeft
      ? x - baseRadius - 6 - (ringOnly && name === "FB" ? 7 : 0)
      : x + baseRadius + 6;
  const labelY =
    insideRing || outsideRight || horizontalRight
      ? y + 5
      : belowRight || belowLeft
        ? y + 20
        : y - baseRadius - 2 - (name === "NØ" ? 5 : 0);
  return (
    <>
      <Circle
        cx={x}
        cy={y}
        r={hover ? baseRadius + 3 : baseRadius}
        fill={coverage?.fill ?? highlightColor ?? theme.background}
        stroke={theme.text}
        strokeWidth={5}
        onPress={() => console.log(`Clicked: ${name}`)}
        {...({
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
        } as any)}
      />
      {requiredStaffing !== undefined && (
        <Text
          x={x}
          y={y + 5}
          textAnchor="middle"
          fontSize={14}
          fontWeight="bold"
          fill={coverage?.text ?? theme.text}
        >
          {requiredStaffing}
        </Text>
      )}
      <Text
        {...text.mapLabel}
        fontSize={16}
        fontWeight="600"
        x={labelX}
        y={labelY}
        textAnchor={mirrored || insideRing || belowLeft ? "end" : "start"}
        transform={`rotate(${insideRing || outsideRight || horizontalRight ? 0 : mirrored || belowRight ? 45 : -45} ${labelX} ${labelY})`}
        {...(highlightColor ? { fill: highlightColor } : {})}
      >
        {name}
      </Text>
    </>
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
  blockedTracks = [],
  initiallyHidden = [],
  requiredStaffing = {},
  stationCoverage = {},
  positions,
  ringStations = defaultRingStations,
  availableSegments,
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
  ringStations?: string[];
  availableSegments?: readonly {
    trackNumber: number;
    stationA: string;
    stationB: string;
  }[];
}) {
  const position = (station: string) =>
    positions ? positions[station] : getStation(station);
  // Each station once, so a station both marked and highlighted is drawn once.
  const highlighted = [
    ...new Set([
      ...markedStations,
      ...(highlightStation !== undefined ? [highlightStation] : []),
    ]),
  ];
  const highlightFor = (station: string) =>
    highlighted.includes(station) ? highlightColor : undefined;
  const [hidden, setHidden] = useState<string[]>(initiallyHidden);
  const visible = lines.filter((l) => !hidden.includes(l.name));
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
        {visible.flatMap(({ name, connections }) =>
          connections
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
                <Fragment key={`${name}-${stationA}-${stationB}`}>
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
            }),
        )}
        {/* Stations and labels sit above every track, including shared lines. */}
        {visibleStations
          .filter((station) => !highlighted.includes(station))
          .map((station) => (
            <Station
              key={station}
              name={station}
              x={position(station)![0]}
              y={position(station)![1]}
              highlightColor={highlightFor(station)}
              ringOnly={ringOnly}
            />
          ))}
        {highlighted
          .filter((station) => position(station) !== undefined)
          .map((station) => (
            <Station
              key={`highlight-${station}`}
              name={station}
              x={position(station)![0]}
              y={position(station)![1]}
              {...(station === highlightStation || !stationCoverage[station]
                ? { highlightColor }
                : // The coverage colour says it all; the steward's own
                  // station keeps its own colour.
                  { coverage: coverageColors[stationCoverage[station]] })}
              requiredStaffing={requiredStaffing[station]}
              ringOnly={ringOnly}
            />
          ))}
      </Svg>
    </View>
  );
}
