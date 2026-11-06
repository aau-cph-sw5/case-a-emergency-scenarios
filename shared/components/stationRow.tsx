import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { card, colors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import { getStationState, type ActiveDeployments } from "./stationState";

export type StationRequirement =
  Scenario["versions"][number]["stationRequirements"][number];

type Props =
  | { requirement: StationRequirement; mode: "needed-only" }
  | {
      requirement: StationRequirement;
      mode?: "live-coverage";
      deployments: ActiveDeployments;
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
    return (
      <View style={[styles.previewCard, { marginBottom: 8, gap: 5 }]}>
        <View style={styles.line}>
          <Text style={styles.name}>{requirement.station}</Text>
          <Text style={styles.previewCount}>
            {requirement.minimumStaffing}{" "}
            {requirement.minimumStaffing === 1 ? "steward" : "stewards"}
          </Text>
        </View>
        <Text style={styles.small}>Placering: {requirement.placement}</Text>
        <Text style={styles.small}>
          Minimum {requirement.minimumStaffing}{" "}
          {requirement.minimumStaffing === 1 ? "steward" : "stewards"}
        </Text>
      </View>
    );
  }
  return (
    <LiveStationRow requirement={requirement} deployments={props.deployments} />
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
      onPress={() => setOpen(!open)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={[
        styles.card,
        {
          borderColor: missing === 0 ? "#bbd9cc" : "#e3cfcd",
          backgroundColor: missing === 0 ? "#f5faf7" : "#fffafa",
        },
      ]}
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
      <View style={styles.footer}>
        <Text
          style={[
            styles.status,
            { color: missing === 0 ? colors.statusGreen : numberColor },
          ]}
        >
          {missing === 0
            ? "Fuldt bemandet"
            : `Mangler ${missing} ${missing === 1 ? "steward" : "stewards"}`}
        </Text>
        <Text style={styles.expandHint}>
          {open ? "Skjul detaljer  −" : "Vis detaljer  +"}
        </Text>
      </View>

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
  card: {
    ...card,
    borderWidth: 1,
    borderRadius: 9,
    padding: 13,
    marginBottom: 9,
    gap: 7,
  },
  previewCard: {
    ...card,
    borderWidth: 1,
    borderColor: "#dce4e5",
    borderRadius: 9,
    padding: 13,
    backgroundColor: "#f8fafa",
  },
  previewCount: { color: "#425a60", fontSize: 12, fontWeight: "700" },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  name: { ...text.body, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  count: { fontSize: 20, fontWeight: "700" },
  small: text.small,
  bold: { fontWeight: "600" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderColor: "#e6e9e8",
    paddingTop: 8,
  },
  status: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  expandHint: { fontSize: 11, color: "#596e73", fontWeight: "600" },
  details: { marginTop: 3, gap: 4 },
});
