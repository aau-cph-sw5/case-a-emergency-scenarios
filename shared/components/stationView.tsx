import { FlatList, StyleSheet, Text, View } from "react-native";
import { badge, colors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import {
  countManned,
  countStewards,
  coverageShare,
  type ActiveDeployments,
} from "./stationState";
import StationRow from "./stationRow";
import metroLineM1 from "../../fixtures/v1/metro-lines/M1.json";
import metroLineM2 from "../../fixtures/v1/metro-lines/M2.json";

const STATION_ORDER = [metroLineM1, metroLineM2].flatMap(({ stops }) =>
  [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map(({ station }) => station),
);
const STATION_RANK = new Map(
  STATION_ORDER.map((station, index) => [station, index]),
);

type Props =
  | { scenario: Scenario; mode: "needed-only" }
  | {
      scenario: Scenario;
      mode?: "live-coverage";
      activeDeployments: ActiveDeployments;
    };

export default function ScenarioStationList(props: Props) {
  const { scenario } = props;
  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion,
  );
  const requirements = version?.stationRequirements ?? [];

  // Worst covered first, so the stations that need help are at the top.
  // Stations covered equally keep the Metro line order. Each share is
  // computed once, not on every comparison the sort makes.
  const rank = (station: string) =>
    STATION_RANK.get(station) ?? Number.MAX_SAFE_INTEGER;
  const stations = requirements
    .map((r) => ({
      r,
      share:
        props.mode === "needed-only"
          ? 0
          : coverageShare(props.activeDeployments, r),
    }))
    .sort((a, b) => a.share - b.share || rank(a.r.station) - rank(b.r.station))
    .map(({ r }) => r);

  const coveredCount =
    props.mode === "needed-only"
      ? null
      : countManned(props.activeDeployments, stations);
  const stewards =
    props.mode === "needed-only"
      ? null
      : countStewards(props.activeDeployments, stations);
  const needed = requirements.reduce((sum, r) => sum + r.minimumStaffing, 0);

  if (stations.length === 0 && props.mode !== "needed-only") {
    return <Text style={styles.small}>Scenariet kræver ingen stationer.</Text>;
  }

  return (
    <FlatList
      data={stations}
      keyExtractor={(item) => item.station}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleLine}>
            <Text style={styles.title}>
              {props.mode === "needed-only"
                ? "Bemandingsbehov"
                : "Påvirkede stationer"}
            </Text>
            <Text style={styles.badge}>{stations.length}</Text>
          </View>
          {props.mode === "needed-only" ? (
            <Text style={styles.small}>
              {stations.length} stationer · {needed} stewards kræves
            </Text>
          ) : (
            stewards !== null && (
              <>
                <Text style={styles.small}>
                  {coveredCount}/{stations.length} stationer dækket
                </Text>
                <Text style={styles.small}>
                  {stewards.arrived}/{stewards.needed} stewards ·{" "}
                  {stewards.enRoute} på vej
                </Text>
              </>
            )
          )}
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.small}>Scenariet kræver ingen stationer.</Text>
      }
      renderItem={({ item }) =>
        props.mode === "needed-only" ? (
          <StationRow requirement={item} mode="needed-only" />
        ) : (
          <StationRow
            requirement={item}
            deployments={props.activeDeployments}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 8, gap: 2 },
  titleLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  badge,
  small: text.small,
});
