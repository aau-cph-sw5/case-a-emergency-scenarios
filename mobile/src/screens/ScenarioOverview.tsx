import { memo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { cardRadius, colors, steward } from "../../../shared/Theme";
import { staffingWords } from "../components/StatusBox";
import {
  ListCard,
  ListSection,
  ListStrip,
  listStripTitle,
} from "../components/ListCard";
import { MovingRow } from "../components/MovingRow";
import { Swap } from "../components/Swap";
import MapRender from "../../../shared/MapRenderer";
import type { MapNetwork } from "../../../shared/network/network";
import type { NetworkStatus } from "../network/useNetwork";
import {
  getStationState,
  stationCoverage,
} from "../../../shared/components/stationState";
import { zoomedViewBox } from "./map-zoom";
import {
  deriveStewardMapModel,
  oneRowPerStation,
  ownStations,
  type StationRequirement,
  type StewardMapData,
} from "./steward-map-data";

export { oneRowPerStation } from "./steward-map-data";

// One task of the own station. A task that fits on one line is a plain row.
// A longer one shows its first line and a chevron, and a press opens it to
// its full text (and closes it again). Whether it is longer than one line is
// measured on a hidden copy of the text without a line limit, because a text
// with numberOfLines reports only the lines it shows.
function TaskRow({
  number,
  instruction,
}: {
  number: number;
  instruction: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const longer = lineCount > 1;
  return (
    <Pressable
      accessibilityRole={longer ? "button" : undefined}
      accessibilityState={longer ? { expanded } : undefined}
      accessibilityHint={
        longer ? (expanded ? "Skjul resten" : "Vis hele opgaven") : undefined
      }
      disabled={!longer}
      onPress={() => setExpanded((value) => !value)}
      style={styles.task}
    >
      <Text style={styles.taskNumber}>{number}.</Text>
      <View style={styles.taskBody}>
        <Text style={styles.taskText} numberOfLines={expanded ? undefined : 1}>
          {instruction}
        </Text>
        <Text
          style={[styles.taskText, styles.taskMeasure]}
          onTextLayout={(event) => setLineCount(event.nativeEvent.lines.length)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {instruction}
        </Text>
      </View>
      {longer && <Text style={styles.taskChevron}>{expanded ? "▴" : "▾"}</Text>}
    </Pressable>
  );
}

// A station row (#376). When the stations do not all fit, the ordinary rows
// get lower, all by the same amount, down to ROW_MIN (name and line under it
// still fit); the own or the chosen row keeps steward.ownRowHeight.
const ROW_HEIGHT = 48;
const ROW_MIN = 34;

// The map of the affected stretch (#376). It sits in the status card under
// the status and is always shown; its box sets its size, and it zooms in on
// the stretch until the station names are legible at the phone's font size
// (MET-A-010). The own station is marked on it.
//
// The map is drawn from the network the app has fetched (or saved). Without a
// network the box says why instead; the notes about a saved or incomplete
// network and an affected stretch the map lacks sit at the bottom of the box.
export function ScenarioMap({
  snapshot,
  assignedStation,
  checkedOutStation,
  network,
  networkIsCached = false,
  networkStatus = "loading",
  onExpand,
}: {
  snapshot: ScenarioSnapshot;
  assignedStation?: string;
  checkedOutStation?: string;
  network?: MapNetwork | null;
  networkIsCached?: boolean;
  networkStatus?: NetworkStatus;
  onExpand?: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  // The map is drawn again only when what it shows changes (MapCard): the
  // scenario, the coverage level of a station, the own station or its size.
  const model =
    network != null
      ? deriveStewardMapModel(
          snapshot,
          network,
          assignedStation,
          checkedOutStation,
        )
      : null;
  const missingStretch = model?.mapData.missingStretch ?? false;
  const missingRoutes = model?.mapData.missingRoutes ?? false;
  const notes = [
    networkIsCached && "Viser gemt metronetværk.",
    network != null &&
      networkStatus === "incomplete" &&
      "Det hentede metronetværk er ufuldstændigt.",
  ].filter((note) => typeof note === "string");
  const mapPreview =
    model !== null ? (
      <MapCard
        stations={model.stations}
        mapData={model.mapData}
        mapKey={model.mapKey}
        required={model.required}
        levels={model.levels}
        levelsKey={model.levelsKey}
        ownStation={model.ownStation}
        width={size.width}
        height={size.height}
        fontScale={fontScale}
      />
    ) : null;
  return (
    <View
      style={styles.fill}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      {mapPreview !== null ? (
        onExpand !== undefined ? (
          <Pressable
            style={styles.fill}
            onPress={onExpand}
            accessibilityRole="button"
            accessibilityLabel="Åbn kort over hele linjen"
          >
            {mapPreview}
            <View
              testID="expand-map-cue"
              style={styles.expandCue}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Svg width={12} height={12} viewBox="0 0 24 24">
                <Path
                  d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                  stroke={colors.text}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
              <Text style={styles.expandCueText}>Udvid</Text>
            </View>
          </Pressable>
        ) : (
          mapPreview
        )
      ) : (
        <Text style={styles.mapMessage}>{NETWORK_MESSAGES[networkStatus]}</Text>
      )}
      {(notes.length > 0 || missingStretch || missingRoutes) && (
        <View style={styles.mapNotes} pointerEvents="none">
          {notes.map((note) => (
            <Text key={note} style={styles.mapNote}>
              {note}
            </Text>
          ))}
          {missingStretch && (
            <Text accessibilityRole="alert" style={styles.mapNote}>
              Den berørte strækning kan ikke vises fuldt ud på dette kort.
            </Text>
          )}
          {missingRoutes && (
            <Text accessibilityRole="alert" style={styles.mapNote}>
              En eller flere ruter kan ikke vises på kortet.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// What the map box says while there is no network to draw from.
const NETWORK_MESSAGES: Record<NetworkStatus, string> = {
  loading: "Indlæser metronetværk.",
  ready: "",
  offline:
    "Kortet er ikke tilgængeligt offline. Opret forbindelse for at hente metronetværket.",
  incomplete: "Kortet kan ikke vises, fordi metronetværket er ufuldstændigt.",
  error: "Kortet kan ikke vises, fordi metronetværket ikke kunne hentes.",
};

// The affected stations in one card (#376), under the status card. Every
// station is shown: when they do not all fit, the ordinary rows get lower
// instead of scrolling. The order is: the steward's own station, then
// stations nobody is assigned to, then the rest.
//
// While the steward has no station, tapping a row selects it (onSelect); the
// slide in the status card then assigns exactly that station. Cancelling is
// done in the status card, not here.
export function ScenarioOverview({
  snapshot,
  onSelect,
  selected,
  pinnedStation,
  assignedStation,
  checkedOutStation,
  ownArrived = false,
}: {
  snapshot: ScenarioSnapshot;
  // Makes the rows selectable. Left out when the steward cannot choose.
  onSelect?: (station: string) => void;
  selected?: string;
  // A station that keeps its place at the top: the one just cancelled, until
  // the steward picks again, so it does not jump away (#376).
  pinnedStation?: string;
  // The station the steward is on the way to or at.
  assignedStation?: string;
  // The station the steward has checked out from. It is no longer their own
  // station, and its row says they left it (#310).
  checkedOutStation?: string;
  // The steward has checked in at their own station: its row turns green.
  ownArrived?: boolean;
}) {
  const { scenario, state } = snapshot;
  // Every requirement row, for the tasks of the own station.
  const requirements = scenario.versions[0]?.stationRequirements ?? [];
  // One row per station, for the list.
  const rows = oneRowPerStation(requirements);
  const { ownStation, leftStation } = ownStations(
    snapshot,
    assignedStation,
    checkedOutStation,
  );
  // The tasks of the own station from ALL its requirement rows (#377), in
  // the order of the rows, numbered from 1; the placements are listed
  // together.
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
  // After check in: whether the other stations are open (the tasks then
  // close to their strip). It starts closed at every check in.
  const arrived = ownArrived && ownStation !== undefined;
  const [restOpen, setRestOpen] = useState(false);
  if (!arrived && restOpen) setRestOpen(false);

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
  // Own station first (or the pinned one), then stations nobody is at or on
  // the way to, then the rest; the sort keeps the scenario's order within
  // each group.
  const group = (row: StationRequirement) => {
    if (row.station === ownStation || row.station === pinnedStation) return 0;
    const coverage = coverageOf(row);
    return coverage.current + coverage.enRoute === 0 ? 1 : 2;
  };
  const sorted = [...rows].sort((a, b) => group(a) - group(b));
  const tall = (row: StationRequirement) =>
    row.station === ownStation || row.station === selected;
  // The ordinary rows share the room the tall row leaves. Before the list has
  // been measured (and in tests) they are ROW_HEIGHT.
  const tallCount = sorted.filter(tall).length;
  const plainCount = sorted.length - tallCount;
  const rowHeight =
    listHeight > 0 && plainCount > 0
      ? Math.max(
          ROW_MIN,
          Math.min(
            ROW_HEIGHT,
            Math.floor(
              (listHeight - tallCount * steward.ownRowHeight) / plainCount,
            ),
          ),
        )
      : ROW_HEIGHT;

  // Each row's distance from the top of the list, so a row that changes place
  // can slide there (MovingRow).
  const tops = new Map<string, number>();
  let nextTop = 0;
  for (const row of sorted) {
    tops.set(row.station, nextTop);
    nextTop += tall(row) ? steward.ownRowHeight : rowHeight;
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
    const sub =
      row.station === leftStation && !own
        ? "Tjekket ud herfra"
        : staffingWords(coverage.current, coverage.enRoute);
    const selectable = onSelect !== undefined && !own;
    // One row in every state, keyed by the station, so a chosen station that
    // becomes the own station stays the same element (#376).
    return (
      <MovingRow
        key={row.station}
        top={tops.get(row.station) ?? 0}
        place={sorted.indexOf(row)}
      >
        <Pressable
          accessibilityRole={selectable ? "button" : undefined}
          accessibilityLabel={selectable ? `Vælg ${row.station}` : undefined}
          accessibilityState={selectable ? { selected: chosen } : undefined}
          disabled={!selectable}
          onPress={selectable ? () => onSelect(row.station) : undefined}
          style={[
            styles.row,
            { height: rowHeight },
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
            <Swap swapKey={sub}>
              <Text style={[styles.sub, onGreen && styles.inverse]}>{sub}</Text>
            </Swap>
          </View>
          {chosen && <Text style={styles.chosenMark}>✓</Text>}
          <Text style={[styles.count, { color: countColor }]}>
            {coverage.current}/{row.minimumStaffing}
            {coverage.current >= row.minimumStaffing ? " ✓" : ""}
          </Text>
        </Pressable>
      </MovingRow>
    );
  };

  // The station list, the same before and after check in.
  const stationList = (
    <View
      style={styles.fill}
      onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
    >
      {/* Scrolls only on a screen too small for every row at ROW_MIN. */}
      <ScrollView style={styles.fill}>{sorted.map(renderRow)}</ScrollView>
    </View>
  );

  // After check in only the own station matters (#376): the card shows the
  // tasks of the own station, and the other stations open on request. It is
  // an accordion in the same frame: opening the stations closes the tasks to
  // their strip, and that strip opens them again.
  if (arrived) {
    // The two parts move by themselves (ListSection).
    const toggle = () => setRestOpen((open) => !open);
    return (
      <ListCard>
        <ListStrip
          first
          title="Påvirkede stationer"
          action={restOpen ? "Vis færre" : `Vis alle ${rows.length}`}
          onPress={toggle}
        />
        {/* Pinned to the top: the tasks strip sliding down uncovers it. */}
        <ListSection open={restOpen} anchor="top">
          {stationList}
        </ListSection>
        <ListStrip
          title={`Opgaver på ${ownStation}`}
          action={restOpen ? "Vis opgaver" : undefined}
          onPress={restOpen ? toggle : undefined}
        />
        {/* Pinned to the bottom: the strip sliding up uncovers it. */}
        <ListSection open={!restOpen} anchor="bottom">
          <ScrollView style={styles.fill} accessibilityLabel="Din opgave">
            {ownPlacement !== "" && (
              <Text style={styles.placement}>{ownPlacement}</Text>
            )}
            {ownActions.length > 0 ? (
              ownActions.map((action, index) => (
                <TaskRow
                  key={action.key}
                  number={index + 1}
                  instruction={action.instruction}
                />
              ))
            ) : (
              <Text style={styles.placement}>
                Ingen opgaver for denne station
              </Text>
            )}
          </ScrollView>
        </ListSection>
      </ListCard>
    );
  }

  return (
    <ListCard>
      <ListStrip
        first
        title={
          // A new heading takes the old one's place with the shared-axis
          // change (Swap), like every other replacement. "nærmeste" is the
          // one word the steward must not overlook, so it is red.
          <Swap swapKey={onSelect ? "choose" : "affected"}>
            {onSelect ? (
              <Text style={listStripTitle} accessibilityRole="header">
                Vælg <Text style={styles.nearest}>nærmeste</Text> station
              </Text>
            ) : (
              <Text style={listStripTitle} accessibilityRole="header">
                Påvirkede stationer
              </Text>
            )}
          </Swap>
        }
      />
      {stationList}
    </ListCard>
  );
}

type MapCardProps = {
  stations: string[];
  mapData: StewardMapData;
  required: StationRequirement[];
  // What the map shows, as plain values, so a new copy of the same scenario
  // or the same coverage does not draw the map again.
  mapKey: string;
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
    stations,
    mapData,
    required,
    levels,
    ownStation,
    width,
    height,
    fontScale,
  }: MapCardProps) {
    const position = (station: string) => mapData.positions[station];
    return (
      <MapRender
        viewBox={zoomedViewBox(stations, width, height, fontScale, position)}
        lines={mapData.lines}
        positions={mapData.positions}
        availableSegments={mapData.availableSegments}
        ringStations={mapData.ringStations}
        colors={mapData.colors}
        blockedTracks={mapData.blockedTracks}
        showLineButtons={false}
        highlightStation={ownStation}
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
    a.mapKey === b.mapKey &&
    a.levelsKey === b.levelsKey &&
    a.ownStation === b.ownStation &&
    a.width === b.width &&
    a.height === b.height &&
    a.fontScale === b.fontScale,
);

function sortedActions(row: StationRequirement) {
  return [...(row.actions ?? [])].sort((a, b) => a.sequence - b.sequence);
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  nearest: { color: steward.nobody },
  mapMessage: {
    color: steward.muted,
    fontSize: 14,
    padding: 16,
    textAlign: "center",
  },
  expandCue: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: steward.line,
    borderRadius: cardRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    position: "absolute",
    right: 6,
    top: 6,
  },
  expandCueText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  mapNotes: {
    bottom: 4,
    left: 8,
    position: "absolute",
    right: 8,
  },
  mapNote: { color: steward.muted, fontSize: 11, textAlign: "center" },
  row: {
    alignItems: "center",
    borderTopColor: steward.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
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
  // The tasks of the own station after check in.
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
  taskBody: { flex: 1 },
  taskText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  // The invisible copy that counts the lines; it takes no room in the row.
  taskMeasure: { left: 0, opacity: 0, position: "absolute", right: 0 },
  taskChevron: { color: steward.muted, fontSize: 14, lineHeight: 21 },
});
