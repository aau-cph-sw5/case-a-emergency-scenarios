import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import {
  lineColors,
  colors,
  text,
  palette,
  panelRadius,
  steward,
} from "../../../shared/Theme";
import { staffingWords } from "../components/StatusBox";
import { SwipeToCancel } from "../components/SwipeToCancel";
import MapRender from "../../../shared/MapRenderer";
import { getLines } from "../../../mockData/data";
import {
  affectedStations,
  affectedStretchAsMapLine,
  networkWithoutStretch,
} from "../../../shared/scenario/affected-stations";
import {
  getStationState,
  stationCoverage,
} from "../../../shared/components/stationState";
import { zoomedViewBox } from "./map-zoom";
import { findOwnAssignment } from "./own-assignment";

// The colour of the affected stretch on the map.
const STRETCH_COLOR = lineColors[0];
// The colour of the steward's own station on the map.
const OWN_COLOR = palette.metroSummerRed;
// A station row, and the taller row of the own or the chosen station (#376).
const ROW_HEIGHT = 48;

type StationRequirement = NonNullable<
  ScenarioSnapshot["scenario"]["versions"][number]["stationRequirements"]
>[number];

// One row per station (#376). A scenario can have several requirement rows
// for the same station (one per placement), and a station must never be
// listed twice. The rows are merged in the order the station first appears,
// and the station needs the stewards of all its rows together: a station
// that needs 1 on the platform and 1 at the entrance needs 2.
export function oneRowPerStation(
  rows: readonly StationRequirement[],
): StationRequirement[] {
  const merged = new Map<string, StationRequirement>();
  for (const row of rows) {
    const seen = merged.get(row.station);
    merged.set(
      row.station,
      seen
        ? {
            ...seen,
            minimumStaffing: seen.minimumStaffing + row.minimumStaffing,
          }
        : row,
    );
  }
  return [...merged.values()];
}

// The map and the affected stations in one card (#376). The map is shown in a
// 21:9 frame from the start; the strip under it collapses it ("Vis alle") to
// show the whole list, and brings it back ("Vis kort"). With the map shown,
// the list holds as many stations as fit in full; without it, it scrolls.
// The order is: the steward's own station, then stations nobody is assigned
// to, then the rest.
//
// While the steward has no station, tapping a row selects it (onSelect); the
// slide at the bottom of the screen then assigns exactly that station. While
// on the way, the own row is swiped (or tapped) to cancel (onCancel).
export function ScenarioOverview({
  snapshot,
  onSelect,
  selected,
  onCancel,
  cancelDisabled = false,
  peekKey,
  mapShown = true,
  onToggleMap,
  assignedStation,
  checkedOutStation,
  ownArrived = false,
}: {
  snapshot: ScenarioSnapshot;
  // Makes the rows selectable. Left out when the steward cannot choose.
  onSelect?: (station: string) => void;
  selected?: string;
  // Offers the swipe on the own row while on the way.
  onCancel?: () => void;
  cancelDisabled?: boolean;
  // Nudges the own row once each time it changes, after assignment.
  peekKey?: number;
  mapShown?: boolean;
  onToggleMap?: () => void;
  // The station the steward is on the way to or at.
  assignedStation?: string;
  // The station the steward has checked out from. It is no longer their own
  // station, and its row says they left it (#310).
  checkedOutStation?: string;
  // The steward has checked in at their own station: its row turns green.
  ownArrived?: boolean;
}) {
  const { scenario, state, userId } = snapshot;
  // The map zooms in on the stretch until its station names are legible at
  // the phone's font size (MET-A-010), so it needs the size of its box.
  const { fontScale } = useWindowDimensions();
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  // Every requirement row, for the tasks of the own station.
  const requirements = scenario.versions[0]?.stationRequirements ?? [];
  // One row per station, for the map and the list.
  const rows = oneRowPerStation(requirements);
  // MET-A-010 criterion 2: the steward's own assignment stands out without
  // interaction. userId comes from the offline copy, so this works offline.
  // The station chosen with + comes first, since the server does not record
  // it in the deployments yet (#263).
  // A checked-out deployment keeps the steward as staff, so the control room
  // sees who was there (#289). It is not the steward's own station any more.
  // After checking out in the app, an older copy of the deployments may still
  // show them at the station, so the app's own status decides (#310).
  const ownAssignment = findOwnAssignment(state.deployments, userId);
  const leftStation =
    checkedOutStation ??
    (ownAssignment?.status === "CHECKED_OUT"
      ? ownAssignment.fulfills
      : undefined);
  const ownStation =
    assignedStation ??
    (checkedOutStation === undefined && ownAssignment?.status !== "CHECKED_OUT"
      ? ownAssignment?.fulfills
      : undefined);
  const ownRow = requirements.find((row) => row.station === ownStation);
  const ownActions = sortedActions(ownRow);
  const [listHeight, setListHeight] = useState(0);

  // The map is drawn again only when what it shows changes: the scenario, the
  // coverage, the own station or its size. Choosing a row, measuring the list
  // and the like re-render the list, not the SVG map (#376).
  const map = useMemo(() => {
    const stretch = affectedStretchAsMapLine(scenario);
    const networkLines = networkWithoutStretch(
      getLines(),
      stretch.connections,
    ).map((line) => ({ ...line, tracks: [1, 2] }));
    const required = oneRowPerStation(
      scenario.versions[0]?.stationRequirements ?? [],
    );
    return (
      <MapRender
        viewBox={zoomedViewBox(
          affectedStations(scenario),
          mapSize.width,
          mapSize.height,
          fontScale,
        )}
        lines={[...networkLines, stretch]}
        colors={{
          [scenario.name]: STRETCH_COLOR,
          M1: palette.networkGrey,
          M2: palette.networkGrey,
          M3: palette.networkGrey,
          M4: palette.networkGrey,
        }}
        showLineButtons={false}
        highlightStation={ownStation}
        highlightColor={OWN_COLOR}
        // Every station the scenario needs staff at, coloured by how far it
        // is covered right now, like the dashboard (MET-A-011).
        markedStations={required.map((row) => row.station)}
        requiredStaffing={Object.fromEntries(
          required.map((row) => [row.station, row.minimumStaffing]),
        )}
        stationCoverage={stationCoverage(required, state)}
      />
    );
  }, [scenario, state, ownStation, mapSize.width, mapSize.height, fontScale]);

  // The coverage of each row, counted once per render (the sort and the rows
  // both need it).
  const coverages = new Map(
    rows.map((row) => [
      row,
      getStationState(state, row.station, row.minimumStaffing),
    ]),
  );
  const coverageOf = (row: StationRequirement) =>
    coverages.get(row) ??
    getStationState(state, row.station, row.minimumStaffing);
  // Own station first, then stations nobody is at or on the way to, then the
  // rest; the sort keeps the scenario's order within each group.
  const group = (row: StationRequirement) => {
    if (row.station === ownStation) return 0;
    const coverage = coverageOf(row);
    return coverage.current + coverage.enRoute === 0 ? 1 : 2;
  };
  const sorted = [...rows].sort((a, b) => group(a) - group(b));
  const tall = (row: StationRequirement) =>
    row.station === ownStation || row.station === selected;
  // With the map shown, only rows that fit in full. Before the list has been
  // measured (and in tests) every row is shown.
  const fitted: StationRequirement[] = [];
  let used = 0;
  for (const row of sorted) {
    used += tall(row) ? steward.ownRowHeight : ROW_HEIGHT;
    // The first row (the own station, when there is one) is always shown,
    // also on a screen too small for it.
    if (listHeight > 0 && used > listHeight && fitted.length > 0) break;
    fitted.push(row);
  }

  const renderRow = (row: StationRequirement) => {
    const own = row.station === ownStation;
    const chosen = !own && row.station === selected;
    const coverage = coverageOf(row);
    const onGreen = own && ownArrived;
    // Two colours only (#375): red when nobody is there or on the way, black
    // otherwise; a highlighted row uses dark or white text instead.
    const countColor = onGreen
      ? colors.textInverse
      : own || chosen || coverage.current + coverage.enRoute > 0
        ? colors.text
        : steward.nobody;
    const swipe = own && !ownArrived && onCancel !== undefined;
    const sub =
      row.station === leftStation && !own
        ? "Tjekket ud herfra"
        : swipe
          ? "‹‹ Swipe for at annullere"
          : staffingWords(coverage.current, coverage.enRoute);
    const content = (
      <View
        style={[
          styles.row,
          (own || chosen) && styles.tallRow,
          (own || chosen) && {
            backgroundColor: onGreen ? steward.green : steward.yellow,
          },
        ]}
      >
        <View style={styles.grow}>
          <Text
            style={[
              styles.name,
              (own || chosen) && styles.bigName,
              onGreen && styles.inverse,
            ]}
            numberOfLines={1}
          >
            {row.station}
          </Text>
          <Text
            style={[
              styles.sub,
              swipe && styles.hint,
              onGreen && styles.inverse,
            ]}
          >
            {sub}
          </Text>
        </View>
        {chosen && <Text style={styles.chosenMark}>✓</Text>}
        <Text style={[styles.count, { color: countColor }]}>
          {coverage.current}/{row.minimumStaffing}
          {coverage.current >= row.minimumStaffing ? " ✓" : ""}
        </Text>
      </View>
    );
    const key = row.station;
    if (swipe) {
      return (
        <SwipeToCancel
          key={key}
          station={row.station}
          onCancel={onCancel}
          peekKey={peekKey}
          disabled={cancelDisabled}
        >
          {content}
        </SwipeToCancel>
      );
    }
    if (onSelect && !own) {
      return (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityLabel={`Vælg ${row.station}`}
          accessibilityState={{ selected: chosen }}
          onPress={() => onSelect(row.station)}
        >
          {content}
        </Pressable>
      );
    }
    return <View key={key}>{content}</View>;
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {mapShown && (
          <View
            style={styles.mapBox}
            onLayout={(event) => setMapSize(event.nativeEvent.layout)}
          >
            {map}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !mapShown }}
          onPress={onToggleMap}
          style={styles.strip}
        >
          <Text style={styles.stripTitle}>
            {onSelect ? "Vælg nærmeste station" : "Påvirkede stationer"}
          </Text>
          <Text style={styles.stripAction}>
            {mapShown ? `Vis alle ${rows.length}` : "Vis kort"}
          </Text>
        </Pressable>
        {mapShown ? (
          <View
            style={styles.list}
            onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
          >
            {fitted.map(renderRow)}
          </View>
        ) : (
          <ScrollView style={styles.list}>{sorted.map(renderRow)}</ScrollView>
        )}
      </View>

      {ownArrived && ownStation !== undefined && (
        // Layout from the design group: a dark card with the station's
        // actions as a numbered list. Sub-issue 3 (#377) gives it its new look.
        <View style={styles.ownCard} accessibilityLabel="Din opgave">
          <Text style={styles.ownCardTitle} accessibilityRole="header">
            Opgaver på {ownStation}
          </Text>
          {ownRow && (
            <Text style={styles.ownCardPlacement}>{ownRow.placement}</Text>
          )}
          {ownActions.length > 0 ? (
            ownActions.map((action, index) => (
              <Text
                key={action.sequence}
                style={[styles.ownCardTask, index > 0 && styles.ownCardDivider]}
              >
                {action.sequence}. {action.instruction}
              </Text>
            ))
          ) : (
            <Text style={styles.ownCardTask}>
              Ingen opgaver for denne station
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function sortedActions(row: StationRequirement | undefined) {
  return [...(row?.actions ?? [])].sort((a, b) => a.sequence - b.sequence);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.background,
    borderColor: steward.line,
    borderRadius: panelRadius,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  mapBox: {
    aspectRatio: 21 / 9,
    margin: 6,
  },
  strip: {
    alignItems: "center",
    backgroundColor: steward.strip,
    borderTopColor: steward.line,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: 15,
  },
  stripTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  stripAction: { color: steward.muted, fontSize: 12, fontWeight: "700" },
  list: {
    flex: 1,
  },
  row: {
    alignItems: "center",
    borderTopColor: steward.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: ROW_HEIGHT,
    paddingHorizontal: 15,
  },
  tallRow: {
    borderTopWidth: 0,
    height: steward.ownRowHeight,
  },
  grow: {
    flex: 1,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  bigName: { fontSize: 22 },
  sub: { color: steward.muted, fontSize: 12 },
  hint: { color: colors.text, fontWeight: "700" },
  inverse: {
    color: colors.textInverse,
  },
  chosenMark: {
    backgroundColor: steward.black,
    borderRadius: 12,
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: "700",
    height: 24,
    lineHeight: 24,
    overflow: "hidden",
    textAlign: "center",
    width: 24,
  },
  count: {
    fontSize: 16,
    fontWeight: "700",
  },

  // The steward's tasks after check in: a dark card plus text labels, so it
  // does not rely on colour alone.
  ownCard: {
    backgroundColor: colors.active,
    // Rounded as in the design group's sketch, like the status panels.
    borderRadius: panelRadius,
    padding: 12,
    marginTop: 8,
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
});
