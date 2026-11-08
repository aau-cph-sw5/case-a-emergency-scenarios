import type { ReactElement, ReactNode } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { badge, colors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import {
  COVERAGE_TONES,
  countManned,
  countStewards,
  coverageShare,
  coverageTone,
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

// Lets the control room show the summary line somewhere else than above the
// rows, so it stays put while they scroll.
type RenderSummary = (summary: ReactElement) => ReactNode;

type Props =
  | {
      scenario: Scenario;
      mode: "needed-only";
      compact?: boolean;
      renderSummary?: RenderSummary;
    }
  | {
      scenario: Scenario;
      mode?: "live-coverage";
      activeDeployments: ActiveDeployments;
      operatorLayout?: boolean;
      renderSummary?: RenderSummary;
    };

export default function ScenarioStationList(props: Props) {
  const { scenario } = props;
  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion,
  );
  const requirements = version?.stationRequirements ?? [];

  // Worst covered first, so the stations that need help are at the top. The
  // control room sorts by colour first: red, orange, yellow, green. Stations
  // covered equally keep the Metro line order. Each value is computed once, not
  // on every comparison the sort makes.
  const rank = (station: string) =>
    STATION_RANK.get(station) ?? Number.MAX_SAFE_INTEGER;
  const stations = requirements
    .map((r) => ({
      r,
      tone:
        props.mode !== "needed-only" && props.operatorLayout
          ? COVERAGE_TONES.indexOf(coverageTone(props.activeDeployments, r))
          : 0,
      share:
        props.mode === "needed-only"
          ? 0
          : coverageShare(props.activeDeployments, r),
    }))
    .sort(
      (a, b) =>
        a.tone - b.tone ||
        a.share - b.share ||
        rank(a.r.station) - rank(b.r.station),
    )
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
  const operatorLayout =
    props.mode === "needed-only" ? props.compact : props.operatorLayout;

  if (stations.length === 0 && props.mode !== "needed-only") {
    return <Text style={styles.small}>Scenariet kræver ingen stationer.</Text>;
  }

  const summary =
    coveredCount === null || stewards === null ? (
      // One line, numbers first, so it reads at a glance.
      <Text
        testID="staffing-plan-summary"
        accessibilityLabel={`${stations.length} påvirkede stationer, ${needed} stewards kræves`}
        style={styles.planSummary}
      >
        <Text style={styles.planSummaryNumber}>{stations.length}</Text>
        {stations.length === 1 ? " station" : " stationer"} ·{" "}
        <Text style={styles.planSummaryNumber}>{needed}</Text>
        {needed === 1 ? " steward" : " stewards"}
      </Text>
    ) : (
      // While live the same line counts up: covered and arrived first.
      <Text
        testID="staffing-plan-summary"
        accessibilityLabel={`${coveredCount} af ${stations.length} stationer dækket, ${stewards.arrived} af ${stewards.needed} stewards ankommet`}
        style={styles.planSummary}
      >
        <Text style={styles.planSummaryNumber}>{coveredCount}</Text>/
        {stations.length}
        {stations.length === 1 ? " station" : " stationer"} ·{" "}
        <Text style={styles.planSummaryNumber}>{stewards.arrived}</Text>/
        {stewards.needed}
        {stewards.needed === 1 ? " steward" : " stewards"}
      </Text>
    );

  return (
    <FlatList
      data={stations}
      keyExtractor={(item) => item.station}
      ListHeaderComponent={
        operatorLayout ? (
          props.renderSummary ? (
            // In a fragment, because FlatList only takes an element here.
            <>{props.renderSummary(summary)}</>
          ) : (
            <View style={styles.summaryHeader}>{summary}</View>
          )
        ) : (
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
        )
      }
      ListEmptyComponent={
        <Text style={styles.small}>Scenariet kræver ingen stationer.</Text>
      }
      renderItem={({ item }) =>
        props.mode === "needed-only" ? (
          <StationRow
            requirement={item}
            mode="needed-only"
            compact={props.compact}
          />
        ) : (
          <StationRow
            requirement={item}
            deployments={props.activeDeployments}
            operatorLayout={props.operatorLayout}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 8, gap: 2 },
  summaryHeader: { marginBottom: 22 },
  titleLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.text, flexShrink: 1 },
  badge,
  small: text.small,
  planSummary: {
    color: colors.blockedTrack,
    fontSize: 15,
    fontWeight: "700",
  },
  planSummaryNumber: { fontSize: 24 },
});
