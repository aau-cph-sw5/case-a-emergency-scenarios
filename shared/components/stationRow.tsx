import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { card, colors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import { getStationState, type ActiveDeployments } from "./stationState";

export type StationRequirement =
  Scenario["versions"][number]["stationRequirements"][number];

type Props =
  | { requirement: StationRequirement; mode: "needed-only"; compact?: boolean }
  | {
      requirement: StationRequirement;
      mode?: "live-coverage";
      deployments: ActiveDeployments;
      operatorLayout?: boolean;
    };

// Red with nobody arrived, yellow while some are missing, green when covered.
function coverageColor(arrived: number, needed: number) {
  if (arrived >= needed) return colors.statusGreen;
  return arrived === 0 ? colors.statusRed : colors.statusYellow;
}

// One card per station, as in the wireframe: arrived against needed, how many
// are on the station and on the way, and how many are still missing. Pressing
// the card shows the placement and the actions.
export default function StationRow(props: Props) {
  const { requirement } = props;
  if (props.mode === "needed-only") {
    if (props.compact) return <PreviewStationRow requirement={requirement} />;
    return (
      <View style={[card, { marginBottom: 8, gap: 4 }]}>
        <Text style={styles.name}>{requirement.station}</Text>
        <Text style={styles.small}>Placering: {requirement.placement}</Text>
        <Text style={styles.small}>
          Minimum {requirement.minimumStaffing}{" "}
          {requirement.minimumStaffing === 1 ? "steward" : "stewards"}
        </Text>
      </View>
    );
  }
  if (props.operatorLayout) {
    return (
      <OperatorStationRow
        requirement={requirement}
        deployments={props.deployments}
      />
    );
  }
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
      style={[styles.tinted, { backgroundColor: colors.coverageNone }]}
    >
      <View style={styles.line}>
        <Text style={styles.tintedName} numberOfLines={1}>
          {requirement.station}
        </Text>
        <Slots
          statuses={Array.from(
            { length: requirement.minimumStaffing },
            () => "UNMANNED" as const,
          )}
        />
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

type SlotStatus = "MANNED" | "PENDING" | "UNMANNED";

// A symbol per status, so the slots also read without the colours: a cross for
// missing, an arrow for on the way, a tick for arrived. They sit on white, which
// holds 4.5:1 against all three, and yellow uses its darker shade for the same
// reason.
const SLOT_SYMBOL: Record<SlotStatus, { color: string; path: string }> = {
  MANNED: { color: colors.statusGreen, path: "M3 8.5 6.5 12 13 4.5" },
  PENDING: {
    color: colors.statusYellowText,
    path: "M2.5 8h11M9 3.5 13.5 8 9 12.5",
  },
  UNMANNED: { color: colors.statusRed, path: "M4 4l8 8M12 4l-8 8" },
};

// One slot per required steward, so the coverage reads without the numbers.
function Slots({
  statuses,
  label,
}: {
  statuses: SlotStatus[];
  label?: string;
}) {
  return (
    <View
      testID="station-staffing-slots"
      accessible={label !== undefined}
      accessibilityLabel={label}
      style={styles.slots}
    >
      {statuses.map((status, index) => (
        <View key={index} testID={`station-slot-${status}`} style={styles.slot}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Path
              d={SLOT_SYMBOL[status].path}
              fill="none"
              stroke={SLOT_SYMBOL[status].color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      ))}
    </View>
  );
}

// The row's background in the control room: red with nobody coming, orange
// while some are missing, yellow when the rest are on the way, green when
// everyone has arrived.
function coverageTint(arrived: number, enRoute: number, needed: number) {
  if (arrived >= needed) return colors.coverageFull;
  if (arrived + enRoute >= needed) return colors.coverageEnRoute;
  return arrived + enRoute === 0 ? colors.coverageNone : colors.coveragePartial;
}

// The control room's row: the station and its slots on a tinted background,
// with the counts, placement and actions behind a press.
function OperatorStationRow({
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
  const waiting = Math.max(0, needed - current - enRoute);
  const [open, setOpen] = useState(false);
  // Exactly one slot per required steward, ordered green/yellow/red.
  const statuses = Array.from({ length: needed }, (_, index) =>
    index < current
      ? "MANNED"
      : index < current + enRoute
        ? "PENDING"
        : "UNMANNED",
  );

  return (
    <Pressable
      testID="operator-station-row"
      accessibilityRole="button"
      accessibilityLabel={`${requirement.station}: ${current} af ${needed} ankommet`}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={[
        styles.tinted,
        { backgroundColor: coverageTint(current, enRoute, needed) },
      ]}
    >
      <View style={styles.line}>
        <Text style={styles.tintedName} numberOfLines={1}>
          {requirement.station}
        </Text>
        <Slots
          statuses={statuses}
          label={`${current} ankommet, ${enRoute} på vej, ${waiting} afventer`}
        />
      </View>
      {open && (
        <View style={styles.details}>
          <Text style={[styles.small, styles.bold]}>
            {current}/{needed} ankommet · {enRoute} på vej
          </Text>
          <Text style={[styles.small, styles.bold]}>
            {requirement.placement}
          </Text>
          {(requirement.actions ?? []).map((a) => (
            <Text key={a.sequence} style={styles.small}>
              {a.sequence}. {a.instruction}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
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
  const color = coverageColor(current, needed);
  // Yellow text is unreadable on white, so the number uses a darker shade.
  const numberColor =
    color === colors.statusYellow ? colors.statusYellowText : color;

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
          : `Mangler ${missing} ${missing === 1 ? "steward" : "stewards"}`}
      </Text>

      {open && (
        <View style={styles.details}>
          <Text style={[styles.small, styles.bold]}>
            {requirement.placement}
          </Text>
          {(requirement.actions ?? []).map((a) => (
            <Text key={a.sequence} style={styles.small}>
              {a.sequence}. {a.instruction}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { ...card, borderLeftWidth: 4, marginBottom: 8, gap: 4 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  name: { ...text.body, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  count: { fontSize: 20, fontWeight: "700" },
  tinted: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  tintedName: {
    ...text.body,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  small: text.small,
  bold: { fontWeight: "600" },
  details: { marginTop: 4, gap: 2 },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  slot: {
    width: 30,
    height: 22,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
