import { colors as theme } from "../../../shared/Theme";
import {
  connectionKey,
  type MapNetwork,
} from "../../../shared/network/network";

type Line = MapNetwork["lines"][number];

// The rest of the line group, drawn faded: routes that do not run in the scenario.
export const IDLE_LINE = "Ude af drift";
// The open track of a segment where only one track is closed.
export const OPEN_LINE = "Åbent spor";

// A route has the colour of the Metro line it runs on (design guide: M1-M4
// for lines). A route that fits more than one line, or none, is Metro Black.
export function linesFitting(route: Line, lines: Line[]) {
  const same = ([a, b]: [string, string], [x, y]: [string, string]) =>
    (a === x && b === y) || (a === y && b === x);
  return lines.filter((line) =>
    route.connections.every((connection) =>
      line.connections.some((other) => same(connection, other)),
    ),
  );
}

export function routeColor(route: Line, lines: Line[]) {
  const fits = linesFitting(route, lines);
  return fits.length === 1 && fits[0].color ? fits[0].color : theme.text;
}

type Pair = [string, string];
// One bucket per output line: the connections it draws and their tracks.
type Bucket = Map<string, { pair: Pair; tracks: number[] }>;

const tracksOf = (line: Line, key: string) =>
  line.connectionTracks?.[key] ?? line.tracks;

// What the routes already draw: every connection (whatever track it runs on)
// and each key|track pair, which is "taken" and so never drawn a second time.
function drawnBy(drawn: Line[]) {
  const keys = new Set<string>();
  const taken = new Set<string>();
  for (const line of drawn)
    for (const [a, b] of line.connections) {
      const key = connectionKey(a, b);
      keys.add(key);
      for (const track of tracksOf(line, key)) taken.add(`${key}|${track}`);
    }
  return { keys, taken };
}

function addTrack(
  buckets: Map<string, Bucket>,
  name: string,
  pair: Pair,
  track: number,
) {
  const key = connectionKey(...pair);
  const bucket = buckets.get(name) ?? new Map();
  buckets.set(name, bucket);
  const entry = bucket.get(key) ?? { pair, tracks: [] };
  entry.tracks.push(track);
  bucket.set(key, entry);
}

// The tracks of one connection that nothing draws yet, marked taken.
function freeTracks(line: Line, key: string, taken: Set<string>) {
  return tracksOf(line, key).filter((track) => {
    const id = `${key}|${track}`;
    if (taken.has(id)) return false;
    taken.add(id);
    return true;
  });
}

function toLine([name, bucket]: [string, Bucket]): Line {
  return {
    name,
    tracks: [...new Set([...bucket.values()].flatMap((e) => e.tracks))],
    connections: [...bucket.values()].map((e) => e.pair),
    connectionTracks: Object.fromEntries(
      [...bucket].map(([key, e]) => [key, e.tracks]),
    ),
  };
}

// The track of the line group that no scenario route draws. It is per track:
// with one track of a segment closed, the other one is still open, so it keeps
// its Metro line's colour. Track that no route reaches anywhere else is drawn
// faded, as one line. A track is drawn once, by the first line that has it.
export function idleStretchLines(
  network: Line[],
  drawn: Line[],
  closed: Line | null,
): Line[] {
  // A connection some route draws is not idle, whatever track it runs on.
  const { keys: drawnKeys, taken } = drawnBy(drawn);
  const partlyClosed = new Set(
    (closed?.connections ?? []).map(([a, b]) => connectionKey(a, b)),
  );

  // The faded bucket, and one open one per Metro line.
  const buckets = new Map<string, Bucket>([[IDLE_LINE, new Map()]]);
  const nameOf = (line: Line, key: string) => {
    if (partlyClosed.has(key)) return `${OPEN_LINE}-${line.name}`;
    return drawnKeys.has(key) ? null : IDLE_LINE;
  };
  for (const line of network)
    for (const pair of line.connections) {
      const name = nameOf(line, connectionKey(...pair));
      if (!name) continue;
      for (const track of freeTracks(line, connectionKey(...pair), taken))
        addTrack(buckets, name, pair, track);
    }

  return [...buckets].filter(([, bucket]) => bucket.size > 0).map(toLine);
}
