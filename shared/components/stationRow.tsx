import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import {
  card,
  colors,
  coverageColors,
  legendSquare,
  mutedOpacity,
  rowDensity,
  accentBorderWidth,
  spacing,
  statusColors,
  statusLabels,
  stewardCell,
  text,
} from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import {
  coverageLevel,
  getStationState,
  type ActiveDeployments,
  type Density,
} from "./stationState";

export type StationRequirement =
  Scenario["versions"][number]["stationRequirements"][number];

type Props =
  | { requirement: StationRequirement; mode: "needed-only"; compact?: boolean }
  | {
      requirement: StationRequirement;
      mode?: "live-coverage";
      deployments: ActiveDeployments;
      operatorLayout?: boolean;
      // How tight the operator rows are, so every station fits at once.
      density?: Density;
    };

// One card per station, as in the wireframe: arrived against needed, how many
// are on the station and on the way, and how many are still missing. Pressing
// the card shows the placement and the actions.
export default function StationRow(props: Props) {
  const { requirement } = props;
  if (props.mode === "needed-only") {
    if (props.compact) return <PreviewStationRow requirement={requirement} />;
    return (
      <View style={[card, { marginBottom: spacing.s8, gap: spacing.small }]}>
        <Text style={styles.name}>{requirement.station}</Text>
        <Text style={styles.small}>Placering: {requirement.placement}</Text>
        <Text style={styles.small}>
          Minimum {requirement.minimumStaffing}{" "}
          {requirement.minimumStaffing === 1 ? "steward" : "stewards"}
        </Text>
      </View>
    );
  }
  if (props.operatorLayout)
    return (
      <OperatorStationRow
        requirement={requirement}
        deployments={props.deployments}
        density={props.density}
      />
    );
  return (
    <LiveStationRow requirement={requirement} deployments={props.deployments} />
  );
}

function PreviewStationRow({
  requirement,
}: {
  requirement: StationRequirement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      testID="preview-station-card"
      accessibilityRole="button"
      accessibilityLabel={`${requirement.station}: ${requirement.minimumStaffing} stewards kræves`}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={[
        styles.card,
        {
          borderLeftColor: colors.statusRed,
          borderRightWidth: accentBorderWidth,
          borderRightColor: colors.statusRed,
        },
      ]}
    >
      <View style={styles.line}>
        <Text style={styles.name}>{requirement.station}</Text>
        <Text style={[styles.count, { color: colors.statusRed }]}>
          {requirement.minimumStaffing}
        </Text>
      </View>
      {open && (
        <View style={styles.details}>
          <Text style={styles.small}>Placering: {requirement.placement}</Text>
          {(requirement.actions ?? []).map((action) => (
            <Text key={action.sequence} style={styles.small}>
              {action.sequence}. {action.instruction}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

// The placement and the actions, shown when a station row is opened.
function StationDetails({
  requirement,
  textStyle,
}: {
  requirement: StationRequirement;
  textStyle: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.details}>
      <Text style={[textStyle, styles.bold]}>{requirement.placement}</Text>
      {(requirement.actions ?? []).map((a) => (
        <Text key={a.sequence} style={textStyle}>
          {a.sequence}. {a.instruction}
        </Text>
      ))}
    </View>
  );
}

function LiveStationRow({
  requirement,
  deployments,
}: {
  requirement: StationRequirement;
  deployments: ActiveDeployments;
}) {
  const { current, enRoute } = getStationState(
    deployments,
    requirement.station,
    requirement.minimumStaffing,
  );
  const needed = requirement.minimumStaffing;
  const missing = Math.max(0, needed - current);
  const color = coverageColors[coverageLevel(current, needed)].fill;
  // Yellow text is unreadable on white, so the number uses a darker shade.
  const numberColor =
    color === statusColors.partial ? colors.statusYellowText : color;

  const [open, setOpen] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={[styles.card, { borderLeftColor: color }]}
    >
      <View style={styles.line}>
        <Text style={styles.name} numberOfLines={1}>
          {requirement.station}
        </Text>
        <Text style={[styles.count, { color: numberColor }]}>
          {current}/{needed}
        </Text>
      </View>
      <View style={styles.line}>
        <Text style={styles.small}>{current} på stationen</Text>

        <Text style={[styles.small, styles.bold]}>{enRoute} på vej</Text>
      </View>
      <Text
        style={[styles.small, missing === 0 && { color: colors.statusGreen }]}
      >
        {missing === 0
          ? "Fuldt bemandet"
          : `${statusLabels.missing} ${missing} ${missing === 1 ? "steward" : "stewards"}`}
      </Text>

      {open && (
        <StationDetails requirement={requirement} textStyle={styles.small} />
      )}
    </Pressable>
  );
}

// One status marker: a square in the status colour and how many stewards are
// in it. Zero is faded, so the three always line up from row to row.
function Marker({
  color,
  textColor,
  count,
  label,
}: {
  color: string;
  textColor: string;
  count: number;
  label: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${count} ${label}`}
      style={[styles.marker, count === 0 && styles.markerZero]}
    >
      <View style={[styles.square, { backgroundColor: color }]} />
      <Text style={[styles.markerCount, { color: textColor }]}>{count}</Text>
    </View>
  );
}

// The status words as they read inside a sentence.
const arrivedWord = statusLabels.arrived.toLowerCase();
const onTheWayWord = statusLabels.onTheWay.toLowerCase();
const missingWord = statusLabels.missing.toLowerCase();

// Up to this many stewards a station shows one cell each; above it the cells
// would be too small to read, so it falls back to the counts.
const MAX_CELLS = 10;

// The staffing plan row in the operator view (Operator Design Guide, Status):
// the station, then one cell per steward it needs: green for each that has
// arrived, yellow for each on the way and red for each still missing. Above
// MAX_CELLS it shows the three counts instead. A station that needs 12, with 2
// arrived and 2 on the way, shows 8 in red.
function OperatorStationRow({
  requirement,
  deployments,
  density = "roomy",
}: {
  requirement: StationRequirement;
  deployments: ActiveDeployments;
  density?: Density;
}) {
  const needed = requirement.minimumStaffing;
  const { current, enRoute } = getStationState(
    deployments,
    requirement.station,
    needed,
  );
  const missing = Math.max(0, needed - current - enRoute);
  const [open, setOpen] = useState(false);

  return (
    <Pressable
      testID="station-row"
      accessibilityRole="button"
      accessibilityLabel={`${requirement.station}: ${current} ${arrivedWord}, ${enRoute} ${onTheWayWord}, ${missing} ${missingWord}`}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={[
        styles.operatorRow,
        { paddingVertical: rowDensity[density].paddingVertical },
      ]}
    >
      <View style={styles.line}>
        <Text
          style={[
            styles.operatorName,
            { fontSize: rowDensity[density].nameSize },
          ]}
          numberOfLines={1}
        >
          {requirement.station}
        </Text>
        {needed <= MAX_CELLS ? (
          <View
            testID="station-cells"
            accessible
            accessibilityLabel={`${current} ${arrivedWord}, ${enRoute} ${onTheWayWord}, ${missing} ${missingWord}`}
            style={styles.cells}
          >
            {Array.from({ length: needed }, (_, index) => {
              const status =
                index < current
                  ? "MANNED"
                  : index < current + enRoute
                    ? "PENDING"
                    : "UNMANNED";
              return (
                <View
                  key={index}
                  testID={`station-slot-${status}`}
                  style={[
                    styles.cell,
                    { backgroundColor: statusColors[status] },
                  ]}
                />
              );
            })}
          </View>
        ) : (
          <View testID="station-counts" style={styles.markers}>
            <Marker
              color={statusColors.MANNED}
              textColor={colors.statusGreen}
              count={current}
              label={arrivedWord}
            />
            <Marker
              color={statusColors.PENDING}
              textColor={colors.statusYellowText}
              count={enRoute}
              label={onTheWayWord}
            />
            <Marker
              color={statusColors.UNMANNED}
              textColor={colors.statusRedText}
              count={missing}
              label={missingWord}
            />
          </View>
        )}
      </View>
      {open && (
        <StationDetails
          requirement={requirement}
          textStyle={styles.operatorDetail}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...card,
    borderLeftWidth: accentBorderWidth,
    marginBottom: spacing.s8,
    gap: spacing.small,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.s8,
  },
  name: {
    ...text.body,
    ...text.operatorCompactName,
    flexShrink: 1,
  },
  count: { fontSize: 20, fontWeight: "700" },
  operatorRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
    gap: spacing.s6,
  },
  operatorName: { ...text.body, ...text.operatorName, flexShrink: 1 },
  markers: { flexDirection: "row", alignItems: "center", gap: spacing.s14 },
  // The cells share what is left of the row, up to a size, so a station with
  // few stewards gets big ones and ten still fit.
  cells: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "flex-end",
    gap: spacing.s3,
  },
  cell: stewardCell,
  marker: { flexDirection: "row", alignItems: "center", gap: spacing.s5 },
  markerZero: { opacity: mutedOpacity },
  square: { width: legendSquare, height: legendSquare },
  markerCount: { ...text.operatorMarkerCount },
  // Operator body text is 13 or more (Operator Design Guide, Typography); the
  // 12 of text.small is for a time stamp, not for instructions to read.
  operatorDetail: { ...text.small, ...text.operatorBody },
  small: text.small,
  bold: { fontWeight: "600" },
  details: { marginTop: spacing.small, gap: 2 },
});
