import { StyleSheet, View } from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { box, surface, lineColors } from "../../../shared/Theme";
import MapRender from "../../../shared/MapRenderer";
import type { ScenarioDefinition } from "../../../shared/scenario/active-scenario";

//helper function as map draws "lines" made of station pairs
//turns the afffected stations (covers) into the maps "lines"
function affectedStretchAsMapLine(scenario: ScenarioDefinition) {
  return {
    name: scenario.name,
    tracks: [1, 2],
    connections: (scenario.covers ?? []).map(
      (segment) => [segment.stationA, segment.stationB] as [string, string],
    ),
  };
}

export function ScenarioOverview({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const { scenario } = snapshot;
  const mapLines = [affectedStretchAsMapLine(scenario)];
  const mapColors = { [scenario.name]: lineColors[0] };

  return (
    <View>
      <View style={styles.mapBox}>
        <MapRender lines={mapLines} colors={mapColors} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    ...surface,
    ...box,
    height: 250,
    marginBottom: 8,
  },
});
