type RouteStop = { sequence?: unknown; station?: unknown };

export function routeConnections(
  route: readonly RouteStop[],
): [string, string][] {
  const stops = [...route].sort(
    (a, b) =>
      (typeof a.sequence === "number" ? a.sequence : 0) -
      (typeof b.sequence === "number" ? b.sequence : 0),
  );
  const connections: [string, string][] = [];

  for (let index = 1; index < stops.length; index += 1) {
    const stationA = stops[index - 1].station;
    const stationB = stops[index].station;
    if (typeof stationA === "string" && typeof stationB === "string") {
      connections.push([stationA, stationB]);
    }
  }

  return connections;
}
