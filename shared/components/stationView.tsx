import { FlatList, StyleSheet, Text, View } from "react-native";
import { badge, colors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import {
  countManned,
  countStewards,
  coverageShare,
  densityFor,
  levelFor,
  type ActiveDeployments,
} from "./stationState";
import StationRow from "./stationRow";
import { CoverageOverview } from "./coverageOverview";
import metroLineM1 from "../../fixtures/v1/metro-lines/M1.json";
import metroLineM2 from "../../fixtures/v1/metro-lines/M2.json";

const STATION_ORDER = [metroLineM1, metroLineM2].flatMap(({ stops }) =>
  [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map(({ station }) => station),
);
export const STATION_RANK = new Map(
  STATION_ORDER.map((station, index) => [station, index]),
);

type Props =
  | { scenario: Scenario; mode: "needed-only"; compact?: boolean }
  | {
      scenario: Scenario;
      mode?: "live-coverage";
      activeDeployments: ActiveDeployments;
      operatorLayout?: boolean;
    };

type Requirement = NonNullable<
  Scenario["versions"][number]["stationRequirements"]
>[number];

// Worst covered first, so the stations that need help are at the top.
// Stations covered equally keep the Metro line order. Each share is
// computed once, not on every comparison the sort makes.
function sortByNeed(requirements: Requirement[], props: Props): Requirement[] {
  const rank = (station: string) =>
    STATION_RANK.get(station) ?? Number.MAX_SAFE_INTEGER;
  return requirements
    .map((r) => ({
      r,
      share:
        props.mode === "needed-only"
          ? 0
          : coverageShare(props.activeDeployments, r),
    }))
    .sort((a, b) => a.share - b.share || rank(a.r.station) - rank(b.r.station))
    .map(({ r }) => r);
}

function PlanSummary({ count, needed }: { count: number; needed: number }) {
  return (
    <View testID="staffing-plan-summary" style={styles.planSummary}>
      <View style={styles.planSummaryRow}>
        <Text style={styles.planSummaryText}>Påvirkede stationer: </Text>
        <Text style={styles.planSummaryText}>{count}</Text>
      </View>
      <View style={[styles.planSummaryRow, styles.planSummaryDivider]}>
        <Text style={styles.planSummaryText}>Nødvendige stewards: </Text>
        <Text style={styles.planSummaryText}>{needed}</Text>
      </View>
    </View>
  );
}

function StationListHeader({
  props,
  stations,
  needed,
  operatorLayout,
}: {
  props: Props;
  stations: Requirement[];
  needed: number;
  operatorLayout: boolean | undefined;
}) {
  if (operatorLayout && props.mode !== "needed-only") {
    return (
      <CoverageOverview
        stations={stations.map((s) => ({
          name: s.station,
          level: levelFor(
            props.activeDeployments,
            s.station,
            s.minimumStaffing,
          ),
        }))}
      />
    );
  }
  const neededOnly = props.mode === "needed-only";
  return (
    <View style={styles.header}>
      {operatorLayout ? (
        <PlanSummary count={stations.length} needed={needed} />
      ) : (
        <View style={styles.titleLine}>
          <Text style={styles.title}>
            {neededOnly && !props.compact
              ? "Bemandingsbehov"
              : "Påvirkede stationer"}
          </Text>
          <Text style={styles.badge}>{stations.length}</Text>
        </View>
      )}
      {neededOnly ? (
        operatorLayout ? null : (
          <Text style={styles.small}>
            {stations.length} stationer · {needed} stewards kræves
          </Text>
        )
      ) : (
        <LiveSummary
          deployments={props.activeDeployments}
          stations={stations}
        />
      )}
    </View>
  );
}

function LiveSummary({
  deployments,
  stations,
}: {
  deployments: ActiveDeployments;
  stations: Requirement[];
}) {
  const coveredCount = countManned(deployments, stations);
  const stewards = countStewards(deployments, stations);
  return (
    <>
      <Text style={styles.small}>
        {coveredCount}/{stations.length} stationer dækket
      </Text>
      <Text style={styles.small}>
        {stewards.arrived}/{stewards.needed} stewards · {stewards.enRoute} på
        vej
      </Text>
    </>
  );
}

export default function ScenarioStationList(props: Props) {
  const { scenario } = props;
  const version = scenario.versions.find(
    (item) => item.version === scenario.currentVersion,
  );
  const requirements = version?.stationRequirements ?? [];
  const stations = sortByNeed(requirements, props);
  const needed = requirements.reduce((sum, r) => sum + r.minimumStaffing, 0);
  const operatorLayout =
    props.mode === "needed-only" ? props.compact : props.operatorLayout;

  if (stations.length === 0 && props.mode !== "needed-only") {
    return <Text style={styles.small}>Scenariet kræver ingen stationer.</Text>;
  }

  return (
    <FlatList
      data={stations}
      keyExtractor={(item) => item.station}
      ListHeaderComponent={
        <StationListHeader
          props={props}
          stations={stations}
          needed={needed}
          operatorLayout={operatorLayout}
        />
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
            density={densityFor(stations.length)}
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
  planSummary: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.blockedTrack,
    overflow: "hidden",
    marginBottom: 22,
  },
  planSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  planSummaryDivider: { borderTopWidth: 1, borderTopColor: colors.textInverse },
  planSummaryText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
});
