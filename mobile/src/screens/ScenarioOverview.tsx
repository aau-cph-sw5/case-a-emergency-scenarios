import { StyleSheet, Text, View } from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import {
  box,
  surface,
  lineColors,
  colors,
  text,
  palette,
} from "../../../shared/Theme";
import MapRender from "../../../shared/MapRenderer";
import { getLines } from "../../../mockData/data";
import {
  affectedStations,
  affectedStretchAsMapLine,
  networkWithoutStretch,
} from "./affected-stations";

// The colour of the affected stretch, on the map and in the legend.
const STRETCH_COLOR = lineColors[0];

export function ScenarioOverview({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const { scenario } = snapshot;
  const mapColors = {
    [scenario.name]: STRETCH_COLOR,
    M1: palette.networkGrey,
    M2: palette.networkGrey,
    M3: palette.networkGrey,
    M4: palette.networkGrey,
  };
  const stations = affectedStations(scenario);
  const rows = scenario.versions[0]?.stationRequirements ?? [];
  const stretch = affectedStretchAsMapLine(scenario);
  const networkLines = networkWithoutStretch(
    getLines(),
    stretch.connections,
  ).map((line) => ({ ...line, tracks: [1, 2] }));
  const mapLines = [...networkLines, stretch];

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
        <MapRender
          lines={mapLines}
          colors={mapColors}
          showLineButtons={false}
        />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendLine} />
        <Text style={styles.body}>Berørt strækning</Text>
      </View>

      <Text style={styles.heading}>Påvirkede stationer</Text>
      {rows.map((row) => (
        <View key={`${row.station}-${row.placement}`} style={styles.station}>
          <Text style={styles.stationName}>
            {row.station} · {row.minimumStaffing} påkrævet
          </Text>
          <Text style={styles.body}>{row.placement}</Text>
          <Text style={styles.body}>
            {row.activeDuring && row.activeDuring.length > 0
              ? `Bemandes: ${row.activeDuring
                  .map(
                    (window) =>
                      `${window.dayPattern} ${window.startTime.slice(0, 5)}-${window.endTime.slice(0, 5)}`,
                  )
                  .join(", ")}`
              : "Bemandes hele tiden"}
          </Text>
          {(row.actions ?? []).length > 0 && (
            <Text style={styles.body}>
              {[...(row.actions ?? [])]
                .sort((a, b) => a.sequence - b.sequence)
                .map((action) => `${action.sequence}. ${action.instruction}`)
                .join("\n")}
            </Text>
          )}
        </View>
      ))}
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

  stationName: {
    ...text.body,
    color: colors.text,
    fontWeight: "600",
  },

  heading: {
    ...text.header,
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  body: {
    ...text.body,
    color: colors.text,
  },
  station: {
    ...surface,
    ...box,
    marginBottom: 6,
  },

  legend: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  legendLine: {
    width: 24,
    height: 4,
    backgroundColor: STRETCH_COLOR,
    marginRight: 8,
  },
});
