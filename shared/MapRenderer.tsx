import { Fragment, useState } from 'react';
import { View, Pressable, Text as RNText } from 'react-native';
import Svg, { Text, Line, Circle } from 'react-native-svg';
import { getStation } from '../mockData/data';
import { text, radius, colors as theme } from './Theme';


type MapLine = { name: string; tracks: number[]; connections: [string, string][] };

function GetOffset(x1: number, y1: number, x2: number, y2: number, offset: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);

  if (length === 0) return { ox: 0, oy: 0 };

  return { ox: (-dy / length) * offset, oy: (dx / length) * offset,};
}


function Station({ name, x, y }: { name: string; x: number; y: number }) {
  const [hover, setHover] = useState(false);
  return (
    <>
      <Circle cx={x} cy={y} r={hover ? 13 : 10} fill={theme.background} stroke={theme.text} strokeWidth={5}
        onPress={() => console.log(`Clicked: ${name}`)}
        {...({ onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) } as any)} />
      <Text {...text.mapLabel} x={x} y={y - 14} textAnchor="middle">
      {name}
      </Text>
    </>
  );
}


function TrackSegment({ stationA, stationB, x1, y1, x2, y2, track, colorA, colorB }: {
  stationA: string; stationB: string; x1: number; y1: number; x2: number; y2: number;
  track: number; colorA: string; colorB: string;
}) {
  const [hover, setHover] = useState(false);
  const w = hover ? 6 : 4;
  const strips: [number, string, number][] = [[4, colorA, w], [8, colorB, w]];
  const side = track === 1 ? -1 : 1;
  const press = () => console.log(`Track ${track}: ${stationA} → ${stationB}`);
  return (
    <>
      {strips.map(([d, color, sw]) => {
        const { ox, oy } = GetOffset(x1, y1, x2, y2, side * d);
        return <Line key={d} x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} stroke={color} strokeWidth={sw}
          onPress={press} {...({ onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) } as any)} />;
      })}
    </>
  );
}


function LineButtons({ colors, hidden, setHidden }: {
  colors: Record<string, string>; hidden: string[]; setHidden: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  return (
    <View style={{ position: 'absolute', flexDirection: 'row', zIndex: 1 }}>
      {Object.keys(colors).map((n) => (
        <Pressable key={n} style={{ backgroundColor: colors[n], 
          opacity: hidden.includes(n) ? 0.3 : 1, padding: 8, margin: 4, borderRadius: radius,}}
          onPress={() => setHidden((h) => h.includes(n) ? h.filter((x: string) => x !== n) : [...h, n])}>
          <RNText style={text.body}>{n}</RNText>
        </Pressable>
      ))}
    </View>
  );
}


function GetColors(visible: MapLine[], colors: Record<string, string>, stationA: string, stationB: string, track: number) {
  const found = visible
    .filter((l) =>
      l.tracks.includes(track) &&
      l.connections.some((c) => c.includes(stationA) && c.includes(stationB))
    )
    .map((l) => colors[l.name]);
  return [found[0], found[1] ?? found[0]];
}


export default function MapRender({ lines, colors }: { lines: MapLine[]; colors: Record<string, string> }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = lines.filter((l) => !hidden.includes(l.name));
  return (
    <View style={{ flex: 1 }}>
      <LineButtons colors={colors} hidden={hidden} setHidden={setHidden} />
      <Svg width="100%" height="100%" viewBox="0 0 950 700" preserveAspectRatio="xMidYMid meet">
        {visible.flatMap(({ name, connections }) =>
          connections.map(([stationA, stationB]) => {
            const [x1, y1] = getStation(stationA);
            const [x2, y2] = getStation(stationB);
            const rails = [1, 2].map((t) => GetColors(visible, colors, stationA, stationB, t));

            return (
              <Fragment key={`${name}-${stationA}-${stationB}`}>
                {rails.map(([colorA, colorB], i) => colorA && (
                  <TrackSegment key={i} {...{ stationA, stationB, x1, y1, x2, y2, colorA, colorB }}
                    track={i + 1} />))}
                <Station name={stationB} x={x2} y={y2} />
                <Station name={stationA} x={x1} y={y1} />
              </Fragment>
            );
          })
        )}
      </Svg>
    </View>
  );
}

