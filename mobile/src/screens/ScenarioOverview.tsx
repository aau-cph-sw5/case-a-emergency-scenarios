import { StyleSheet, Text, View } from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { box, surface, lineColors, colors, text } from "../../../shared/Theme";
import MapRender from "../../../shared/MapRenderer";

import {
  affectedStations,
  affectedStretchAsMapLine,
  areaAroundStations,} from "./affected-stations";

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
        <MapRender lines={mapLines} colors={mapColors} viewBox={areaAroundStations(stations)} showLineButtons={false} />
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
