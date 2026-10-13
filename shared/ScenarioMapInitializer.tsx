import type { Scenario } from './ScenarioParser';
import MapRender from './MapRenderer';
import { parseScenario } from './ScenarioParser';
import { lineColors } from './Theme';
 
// Parses the scenario and hands the result to the map renderer
export default function ScenarioMapInitializer({ scenario }: { scenario: Scenario }) {
  const lines = parseScenario(scenario);
  const colors = Object.fromEntries(lines.map((l: { name: string }, i: number) => [l.name, lineColors[i % lineColors.length]]));
  return <MapRender lines={lines} colors={colors} />;
}