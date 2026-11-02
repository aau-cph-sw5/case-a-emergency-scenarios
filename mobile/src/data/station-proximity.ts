// Where a station sits on a metro line. Stations on the same line are
// close when their sequence numbers are; stations on different lines are
// treated as far apart.
export type StopPosition = { line: string; sequence: number };

function distance(a: StopPosition | undefined, b: StopPosition | undefined) {
  if (!a || !b || a.line !== b.line) return Number.POSITIVE_INFINITY;
  return Math.abs(a.sequence - b.sequence);
}

// Orders the scenario's stations by proximity to `from`, nearest first.
// Stations with equal distance, or unknown to `positions`, keep the order
// they have in `stations`. With no `from`, the order is unchanged.
export function orderByProximity(
  stations: string[],
  from: string | null,
  positions: Record<string, StopPosition>,
): string[] {
  if (from === null) return [...stations];
  const origin = positions[from];
  return stations
    .map((station, index) => ({
      station,
      index,
      distance: distance(origin, positions[station]),
    }))
    .sort((a, b) => {
      // Infinity - Infinity is NaN, so compare explicitly.
      if (a.distance !== b.distance) return a.distance < b.distance ? -1 : 1;
      return a.index - b.index;
    })
    .map((entry) => entry.station);
}
