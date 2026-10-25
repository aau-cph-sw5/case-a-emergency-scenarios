import type { Scenario } from "../types/v1/scenario";
import MapRender from "./mapRenderer";
import { parseScenario } from "./scenarioParser";
import { lineColors } from "../Theme";
import { areaAroundStations } from "./affectedStations";

export default function ScenarioMapInitializer({
  scenario,
}: {
  scenario: Scenario;
}) {
  const lines = parseScenario(scenario);
  const colors = Object.fromEntries(
    lines.map((line: { name: string }, index: number) => [
      line.name,
      lineColors[index % lineColors.length],
    ]),
  );
  const stations = Array.from(
    new Set<string>(
      lines.flatMap((line: { connections: string[][] }) =>
        line.connections.flatMap((pair: string[]) => pair),
      ),
    ),
  );

  return (
    <MapRender
      lines={lines}
      colors={colors}
      viewBox={areaAroundStations(stations)}
    />
  );
}
