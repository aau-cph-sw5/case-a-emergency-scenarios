import { View } from "react-native";
import MapRender from "../../../shared/MapRenderer";
import { lineColors } from "../../../shared/Theme";
import { getLines } from "../../../mockData/data";
import {
  affectedStretchAsMapLine,
  areaAroundStations,
  linesThrough,
  requiredStations,
} from "../../../shared/scenario/affected-stations";
import type { Scenario } from "../../../shared/types/v1/scenario";
import { useScenario } from "../data/useScenario";

// The whole metro network, each line in its own colour (M1 to M4). The colour
// belongs to the line, so M2 keeps its colour when it is shown alone.
const network = getLines().map((line) => ({ ...line, tracks: [1, 2] }));
const lineColor = Object.fromEntries(
  network.map((line, index) => [line.name, lineColors[index]]),
);

// What the map shows for the selected scenario (#183). Only the lines through
// its covered pieces, or the whole network when none of them is on the map.
// The stations its current version needs staff at are marked. The view fits
// the whole of the lines shown, so they sit in the middle of the frame rather
// than where they lie on the full map; the covered stretch is not zoomed in on.
export function mapView(scenario: Scenario | null) {
  const covered =
    scenario === null
      ? []
      : linesThrough(network, affectedStretchAsMapLine(scenario).connections);
  const lines = covered.length > 0 ? covered : network;
  const markedStations = scenario === null ? [] : requiredStations(scenario);
  return {
    lines,
    colors: Object.fromEntries(
      lines.map((line) => [line.name, lineColor[line.name]]),
    ),
    markedStations,
    // Undefined for the whole network, which keeps the map's own view.
    viewBox:
      covered.length > 0
        ? areaAroundStations(covered.flatMap((line) => line.connections.flat()))
        : undefined,
  };
}

export function MetroMap({ scenarioId }: { scenarioId: string | null }) {
  // While the scenario loads, or if it cannot be loaded, scenario is null and
  // the whole network is shown. The preview next to the map shows the error.
  const { scenario } = useScenario(scenarioId);
  const { lines, colors, markedStations, viewBox } = mapView(scenario);
  return (
    <View style={{ flex: 1 }}>
      {/* A new key for each scenario resets the lines the operator has
          hidden, so a hidden line does not stay hidden in the next one. */}
      <MapRender
        key={scenarioId ?? "none"}
        lines={lines}
        colors={colors}
        viewBox={viewBox}
        markedStations={markedStations}
      />
    </View>
  );
}
