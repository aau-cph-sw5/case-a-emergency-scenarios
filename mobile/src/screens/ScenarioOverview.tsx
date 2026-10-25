import { StyleSheet, Text, View } from "react-native";
import type { Scenario } from "../../../shared/types/v1/scenario";
import {
  box,
  surface,
  lineColors,
  colors,
  text,
  palette,
} from "../../../shared/Theme";
import MapRender from "../../../shared/components/mapRenderer";
import { parseStationRequirements } from "../../../shared/components/scenarioParser";
import { getLines } from "../../../shared/components/lines";
import {
  affectedStations,
  affectedStretchAsMapLine,
  networkWithoutStretch,
} from "../../../shared/components/affectedStations";

// The colour of the affected stretch, on the map and in the legend.
const STRETCH_COLOR = lineColors[0];

type StationRow = {
  station: string;
  placement: string;
  staff: number;
  times: string[];
  actions: string[];
};

export function ScenarioOverview({
  snapshot,
}: {
  snapshot: { scenario: Scenario };
}) {
  const { scenario } = snapshot;
  const mapColors = {
    [scenario.name]: STRETCH_COLOR,
    M1: palette.pageGrey,
    M2: palette.pageGrey,
    M3: palette.pageGrey,
    M4: palette.pageGrey,
  };
  const stations = affectedStations(scenario);
  const rows =
    scenario.versions.length > 0
      ? (parseStationRequirements(scenario) as StationRow[])
      : [];
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

      <Text style={styles.heading}>Påvirkede stationer</Text>
      {rows.map((row) => (
        <View
          key={`${row.station}-${row.placement}-${row.times.join(",")}`}
          style={styles.station}
        >
          <Text style={styles.stationName}>
            {row.station} · {row.staff} påkrævet
          </Text>
          <Text style={styles.body}>{row.placement}</Text>
          <Text style={styles.body}>
            {row.times.length > 0
              ? `Bemandes: ${row.times.join(", ")}`
              : "Bemandes hele tiden"}
          </Text>
          {row.actions.length > 0 && (
            <Text style={styles.body}>
              {row.actions
                .map((action, index) => `${index + 1}. ${action}`)
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