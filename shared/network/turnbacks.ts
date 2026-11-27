import { connectionKey, edgeAllowed, type MapNetwork } from "./network.js";
import { getCrossovers, type Crossover } from "./crossovers.js";

type Turnback = { crossover: Crossover; extension?: [string, string] };

// Prefer the segment already travelled. Only consider a segment beyond the
// endpoint when it exists in this network and both physical tracks are usable.
export function selectTurnbacks(
  group: "M1/M2" | "M3/M4",
  path: readonly string[],
  lines: MapNetwork["lines"],
  segments?: MapNetwork["segments"],
): { start?: Turnback; end?: Turnback } {
  if (path.length < 2 || path[0] === path.at(-1)) return {};
  const crossovers = getCrossovers().filter((item) => item.lineGroup === group);
  const available = (a: string, b: string) =>
    lines.some(
      (line) =>
        line.connections.some(
          ([x, y]) => connectionKey(x, y) === connectionKey(a, b),
        ) && edgeAllowed(line, segments, [1, 2], a, b),
    );
  function select(endpoint: string, neighbour: string): Turnback | undefined {
    const internal = crossovers.find(
      ({ between }) =>
        connectionKey(...between) === connectionKey(endpoint, neighbour),
    );
    if (internal && available(endpoint, neighbour))
      return { crossover: internal };
    const candidates = crossovers
      .filter(
        ({ between }) =>
          between.includes(endpoint) && !between.includes(neighbour),
      )
      .filter(({ between }) => available(...between));
    if (candidates.length !== 1) return undefined;
    const crossover = candidates[0];
    return {
      crossover,
      extension: [
        endpoint,
        crossover.between.find((station) => station !== endpoint)!,
      ],
    };
  }
  return {
    start: select(path[0], path[1]),
    end: select(path[path.length - 1], path[path.length - 2]),
  };
}
