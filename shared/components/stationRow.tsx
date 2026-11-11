import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { card, colors, coverageColors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import {
  coverageLevel,
  getStationState,
  type ActiveDeployments,
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
    };

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
  return (
    <LiveStationRow
      requirement={requirement}
      deployments={props.deployments}
      operatorLayout={props.operatorLayout}
    />
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
          borderRightWidth: 4,
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

function LiveStationRow({
  requirement,
  deployments,
  operatorLayout = false,
}: {
  requirement: StationRequirement;
  deployments: ActiveDeployments;
  operatorLayout?: boolean;
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
    color === colors.statusYellow ? colors.statusYellowText : color;

  const [open, setOpen] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(!open)}
      style={[
        styles.card,
        { borderLeftColor: color },
        operatorLayout && { borderRightWidth: 4, borderRightColor: color },
      ]}
    >
      <View style={styles.line}>
        <Text
          style={[styles.name, operatorLayout && styles.operatorName]}
          numberOfLines={1}
        >
          {requirement.station}
        </Text>
        {operatorLayout && (
          <View
            testID="station-staffing-slots"
            accessible
            accessibilityLabel={`${current} ankommet, ${enRoute} på vej, ${Math.max(0, needed - current - enRoute)} afventer`}
            style={styles.slots}
          >
            {Array.from({ length: needed }, (_, index) => {
              // Exactly one slot per required steward, ordered green/yellow/red.
              const status =
                index < current
                  ? "MANNED"
                  : index < current + enRoute
                    ? "PENDING"
                    : "UNMANNED";
              const backgroundColor =
                status === "MANNED"
                  ? colors.statusGreen
                  : status === "PENDING"
                    ? colors.statusYellow
                    : colors.statusRed;
              return (
                <View
                  key={index}
                  testID={`station-slot-${status}`}
                  style={[styles.slot, { backgroundColor }]}
                />
              );
            })}
          </View>
        )}
        <Text
          style={[
            styles.count,
            { color: numberColor },
            operatorLayout && styles.operatorCount,
          ]}
        >
          {current}/{needed}
        </Text>
      </View>
      <View style={styles.line}>
        <Text style={styles.small}>{current} på stationen</Text>

        <Text style={[styles.small, styles.bold]}>{enRoute} på vej</Text>
      </View>
      {(!operatorLayout || missing === 0) && (
        <Text
          style={[styles.small, missing === 0 && { color: colors.statusGreen }]}
        >
          {missing === 0
            ? "Fuldt bemandet"
            : `Mangler ${missing} ${missing === 1 ? "steward" : "stewards"}`}
        </Text>
      )}

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
  operatorName: { flexBasis: 0, flexGrow: 1 },
  operatorCount: { flexBasis: 0, flexGrow: 1, textAlign: "right" },
  small: text.small,
  bold: { fontWeight: "600" },
  details: { marginTop: 4, gap: 2 },
  slots: {
    flexBasis: 0,
    flexGrow: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    flexShrink: 1,
  },
  slot: {
    width: 13,
    height: 22,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
