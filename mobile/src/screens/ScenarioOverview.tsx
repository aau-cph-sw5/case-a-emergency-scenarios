import { memo, useState } from "react";
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
  palette,
  panelRadius,
  steward,
} from "../../../shared/Theme";
import { staffingWords } from "../components/StatusBox";
import { AxisSwap } from "../components/AxisSwap";
import { RevealBox } from "../components/RevealBox";
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
  restOpen = false,
  onToggleRest,
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
  // After check in (#377): whether the other stations are open under the map.
  // The tasks then close to their strip, and the strip opens them again.
  restOpen?: boolean;
  onToggleRest?: () => void;
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
  // The tasks of the own station from ALL its requirement rows (#377), in the
  // order of the rows, numbered from 1; the placements are listed together.
  const ownRows = requirements.filter((row) => row.station === ownStation);
  const ownActions = ownRows.flatMap((row) =>
    sortedActions(row).map((action) => ({
      key: `${row.placement}-${action.sequence}`,
      instruction: action.instruction,
    })),
  );
  const ownPlacement = [...new Set(ownRows.map((row) => row.placement))].join(
    " · ",
  );
  const [listHeight, setListHeight] = useState(0);

  // The map is drawn again only when what it shows changes (MapCard): the
  // scenario, the coverage level of a station, the own station or its size.
  // A new copy of the scenario with the same content does not redraw it.
  const levels = stationCoverage(rows, state);
  const map = (
    <MapCard
      scenario={scenario}
      scenarioKey={`${scenario.scenarioId}@${scenario.currentVersion}`}
      levels={levels}
      levelsKey={JSON.stringify(levels)}
      ownStation={ownStation}
      width={mapSize.width}
      height={mapSize.height}
      fontScale={fontScale}
    />
  );

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
          <AxisSwap swapKey={sub}>
            <Text
              style={[
                styles.sub,
                swipe && styles.hint,
                onGreen && styles.inverse,
              ]}
            >
              {sub}
            </Text>
          </AxisSwap>
        </View>
        {chosen && <Text style={styles.chosenMark}>✓</Text>}
        <Text style={[styles.count, { color: countColor }]}>
          {coverage.current}/{row.minimumStaffing}
          {coverage.current >= row.minimumStaffing ? " ✓" : ""}
        </Text>
      </View>
    );
    // One row component in every state, keyed by the station, so a chosen
    // station that becomes the own station stays the same element (#376).
    return (
      <SwipeToCancel
        key={row.station}
        station={row.station}
        onCancel={swipe ? onCancel : undefined}
        onSelect={onSelect && !own ? () => onSelect(row.station) : undefined}
        selected={chosen}
        peekKey={swipe ? peekKey : undefined}
        disabled={swipe && cancelDisabled}
      >
        {content}
      </SwipeToCancel>
    );
  };

  // After check in only the own station matters (#377): the map is always
  // shown, the other stations only on request, and the tasks of the own
  // station hang under them in the SAME frame.
  const arrived = ownArrived && ownStation !== undefined;
  const showMap = arrived || mapShown;
  // The tasks hang under the map in the same frame (#377). Their text is
  // pinned to the bottom of its box (RevealBox), so the heading strip
  // sliding up uncovers it and sliding down covers it again.
  const tasks = arrived && (
    <View
      style={[styles.tasks, restOpen && styles.tasksClosed]}
      accessibilityLabel="Din opgave"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !restOpen }}
        disabled={!restOpen}
        onPress={onToggleRest}
        style={styles.strip}
      >
        <Text style={styles.stripTitle} accessibilityRole="header">
          Opgaver på {ownStation}
        </Text>
        {restOpen && <Text style={styles.stripAction}>Vis opgaver</Text>}
      </Pressable>
      <RevealBox open={!restOpen} anchor="bottom" openStyle={styles.list}>
        <ScrollView style={styles.list}>
          {ownPlacement !== "" && (
            <Text style={styles.placement}>{ownPlacement}</Text>
          )}
          {ownActions.length > 0 ? (
            ownActions.map((action, index) => (
              <View key={action.key} style={styles.task}>
                <Text style={styles.taskNumber}>{index + 1}.</Text>
                <Text style={styles.taskText}>{action.instruction}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.placement}>
              Ingen opgaver for denne station
            </Text>
          )}
        </ScrollView>
      </RevealBox>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        {/* The map is pinned to the top of its box, so the strip under it
            covers it as it slides up and uncovers it as it slides down. */}
        <RevealBox open={showMap} anchor="top" openStyle={styles.mapBox}>
          <View
            style={styles.list}
            onLayout={(event) => setMapSize(event.nativeEvent.layout)}
          >
            {map}
          </View>
        </RevealBox>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: arrived ? restOpen : !mapShown }}
          onPress={arrived ? onToggleRest : onToggleMap}
          style={styles.strip}
        >
          {/* A new heading takes the old one's place with the shared-axis
              change (AxisSwap), like every other replacement. */}
          <AxisSwap swapKey={onSelect ? "choose" : "affected"}>
            <Text style={styles.stripTitle}>
              {onSelect ? "Vælg nærmeste station" : "Påvirkede stationer"}
            </Text>
          </AxisSwap>
          <Text style={styles.stripAction}>
            {arrived
              ? restOpen
                ? "Vis færre"
                : `Vis alle ${rows.length}`
              : mapShown
                ? `Vis alle ${rows.length}`
                : "Vis kort"}
          </Text>
        </Pressable>
        {arrived ? (
          // The other stations are pinned to the top of their box, so the
          // tasks strip sliding down uncovers them.
          <RevealBox open={restOpen} anchor="top" openStyle={styles.list}>
            <ScrollView style={styles.list}>{sorted.map(renderRow)}</ScrollView>
          </RevealBox>
        ) : mapShown ? (
          <View
            style={styles.list}
            onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
          >
            {fitted.map(renderRow)}
          </View>
        ) : (
          <ScrollView style={styles.list}>{sorted.map(renderRow)}</ScrollView>
        )}
        {tasks}
      </View>
    </View>
  );
}

type MapCardProps = {
  scenario: ScenarioSnapshot["scenario"];
  // What the map shows, as plain values, so a new copy of the same scenario
  // or the same coverage does not draw the map again.
  scenarioKey: string;
  levels: ReturnType<typeof stationCoverage>;
  levelsKey: string;
  ownStation: string | undefined;
  width: number;
  height: number;
  fontScale: number;
};

// The SVG map of the affected stretch. Drawing it is the most expensive part
// of the screen, and the screen renders many times for one status change, so
// it is drawn again only when one of the plain values above changes.
const MapCard = memo(
  function MapCard({
    scenario,
    levels,
    ownStation,
    width,
    height,
    fontScale,
  }: MapCardProps) {
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
          width,
          height,
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
        stationCoverage={levels}
      />
    );
  },
  (a, b) =>
    a.scenarioKey === b.scenarioKey &&
    a.levelsKey === b.levelsKey &&
    a.ownStation === b.ownStation &&
    a.width === b.width &&
    a.height === b.height &&
    a.fontScale === b.fontScale,
);

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

  // After check in the station card only holds the map and its strip, and
  // the tasks fill the rest of the same frame (#377).
  tasks: {
    backgroundColor: colors.background,
    borderTopColor: steward.line,
    borderTopWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  tasksClosed: {
    flex: 0,
  },
  placement: {
    color: steward.muted,
    fontSize: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  task: {
    borderTopColor: steward.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  taskNumber: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 20,
  },
  taskText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
  },
});
