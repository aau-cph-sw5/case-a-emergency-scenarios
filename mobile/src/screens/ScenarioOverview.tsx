import { StyleSheet, Text, View } from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { box, surface, lineColors, colors, text } from "../../../shared/Theme";
import MapRender from "../../../shared/MapRenderer";
import type { ScenarioDefinition } from "../../../shared/scenario/active-scenario";

//helper function as map draws "lines" made of station pairs
//turns the affected stations (covers) into the maps "lines"
function affectedStretchAsMapLine(scenario: ScenarioDefinition) {
  return {
    name: scenario.name,
    tracks: [1, 2],
    connections: (scenario.covers ?? []).map(
      (segment) => [segment.stationA, segment.stationB] as [string, string],
    ),
  };
}

//helper function to name stations in order.
//covers is the affected stations and the stations in the middle appear twice
function affectedStations(scenario: ScenarioDefinition) {
  return [
    ...new Set(
      (scenario.covers ?? []).flatMap((segment) => [
        segment.stationA,
        segment.stationB,
      ]),
    ),
  ];
}

export function ScenarioOverview({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const { scenario } = snapshot;
  const mapLines = [affectedStretchAsMapLine(scenario)];
  const mapColors = { [scenario.name]: lineColors[0] };
  const stations = affectedStations(scenario);

  return (
    <View>
      <Text style={styles.title}>{scenario.name}</Text>

      {stations.length > 0 ? (
        <Text style={styles.where}>
          {stations[0]} → {stations[stations.length - 1]}
        </Text>
      ) : (
        <Text style={styles.where}>ingen berørte stationer</Text>
      )}

      <View style={styles.mapBox}>
        <MapRender lines={mapLines} colors={mapColors} />
      </View>

      <View style={styles.stationList}>
        {stations.map((station) => (
          <Text key={station} style={styles.stationName}>
            {station}
          </Text>
        ))}
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
  title: {
    ...text.title,
    color: colors.text,
    marginBottom: 4,
  },
  where: {
    ...text.body,
    color: colors.text,
    marginBottom: 8,
  },

  stationList: {
    ...surface,
    ...box,
  },
  stationName: {
    ...text.body,
    color: colors.text,
  },
});
