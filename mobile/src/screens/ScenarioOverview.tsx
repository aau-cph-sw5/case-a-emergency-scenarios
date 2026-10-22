import { ScrollView, StyleSheet, Text, View } from "react-native";
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
import { parseStationRequirements } from "../../../shared/ScenarioParser";
import { getLines } from "../../../mockData/data";
import {
  affectedStations,
  affectedStretchAsMapLine,
  networkWithoutStretch,
} from "./affected-stations";
import { findOwnAssignment } from "./own-assignment";

// The colour of the affected stretch, on the map and in the legend.
const STRETCH_COLOR = lineColors[0];
// The colour of the steward's own station, on the map, in the list and in the legend.
const OWN_COLOR = palette.metroSummerRed;

type StationRow = {
  station: string;
  placement: string;
  staff: number;
  times: string[];
  actions: string[];
};

export function ScenarioOverview({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const { scenario, state, userId } = snapshot;
  const mapColors = {
    [scenario.name]: STRETCH_COLOR,
    M1: palette.networkGrey,
    M2: palette.networkGrey,
    M3: palette.networkGrey,
    M4: palette.networkGrey,
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
  // MET-A-010 criterion 2: the steward's own assignment stands out without
  // interaction. userId comes from the offline copy, so this works offline.
  const ownAssignment = findOwnAssignment(state.deployments, userId);
  const ownStation = ownAssignment?.fulfills;
  const ownRow = rows.find((row) => row.station === ownStation);

  // Scrolls vertically so the whole overview can be reached on a phone screen.
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
          highlightStation={ownStation}
          highlightColor={OWN_COLOR}
        />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendLine} />
        <Text style={styles.body}>Berørt strækning</Text>
      </View>
      {ownStation !== undefined && (
        <View style={styles.legend}>
          <View style={styles.legendDot} />
          <Text style={styles.body}>Din station</Text>
        </View>
      )}

      {ownStation !== undefined ? (
        // Layout from the design group: a dark card with the station's
        // actions as a numbered list, so it stands out from the white cards.
        <View style={styles.ownCard} accessibilityLabel="Din opgave">
          <Text style={styles.ownCardTitle} accessibilityRole="header">
            Opgaver på {ownStation}
          </Text>
          {ownRow && (
            <Text style={styles.ownCardPlacement}>{ownRow.placement}</Text>
          )}
          {ownRow && ownRow.actions.length > 0 ? (
            ownRow.actions.map((action, index) => (
              <Text
                key={action}
                style={[styles.ownCardTask, index > 0 && styles.ownCardDivider]}
              >
                {index + 1}. {action}
              </Text>
            ))
          ) : (
            <Text style={styles.ownCardTask}>
              Ingen opgaver for denne station
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.noAssignmentBox}>
          <Text style={styles.body}>Ingen opgave endnu</Text>
        </View>
      )}

      <Text style={styles.heading}>Påvirkede stationer</Text>
      {rows.map((row) => {
        const isOwn = row.station === ownStation;
        return (
          <View
            key={`${row.station}-${row.placement}-${row.times.join(",")}`}
            style={[styles.station, isOwn && styles.ownStationRow]}
          >
            {isOwn && <Text style={styles.ownLabel}>Din station</Text>}
            <Text style={styles.stationName}>
              {row.station} · {row.staff} påkrævet
            </Text>
            <StationDetails row={row} short={isOwn} />
          </View>
        );
      })}
    </ScrollView>
  );
}

// Placement, staffing times and actions of one station in the list. The
// steward's own station is short: its placement and actions are already in
// the "Opgaver på" card above, so they are not repeated here.
function StationDetails({
  row,
  short = false,
}: {
  row: StationRow;
  short?: boolean;
}) {
  return (
    <>
      {!short && <Text style={styles.body}>{row.placement}</Text>}
      <Text style={styles.body}>
        {row.times.length > 0
          ? `Bemandes: ${row.times.join(", ")}`
          : "Bemandes hele tiden"}
      </Text>
      {!short && row.actions.length > 0 && (
        <Text style={styles.body}>
          {row.actions
            .map((action, index) => `${index + 1}. ${action}`)
            .join("\n")}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
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
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: OWN_COLOR,
    marginLeft: 5,
    marginRight: 13,
  },

  // The steward's own assignment: a thick border in OWN_COLOR plus a text
  // label, so it does not rely on colour alone.
  ownCard: {
    backgroundColor: colors.active,
    // Rounded as in the design group's sketch. Only this card: the theme's
    // radius stays 0 for the rest of the app.
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  ownCardTitle: {
    ...text.title,
    color: colors.textInverse,
    marginBottom: 4,
  },
  ownCardPlacement: {
    ...text.body,
    color: colors.textInverse,
    marginBottom: 6,
  },
  ownCardTask: {
    ...text.body,
    color: colors.textInverse,
    paddingVertical: 8,
    paddingLeft: 8,
  },
  ownCardDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.networkGrey,
  },
  ownLabel: {
    ...text.body,
    color: OWN_COLOR,
    fontWeight: "700",
  },
  ownStationRow: {
    borderWidth: 3,
    borderColor: OWN_COLOR,
  },
  noAssignmentBox: {
    ...surface,
    ...box,
    marginBottom: 8,
  },
});
