import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, text } from "../Theme";
import type { Scenario } from "../types/v1/scenario";
import { getStationState, type ActiveDeployments } from "./stationState";

export type StationRequirement =
  Scenario["versions"][number]["stationRequirements"][number];

type Props = {
  requirement: StationRequirement;
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
export default function StationRow({ requirement, deployments }: Props) {
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
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.subtleBorder,
    borderLeftWidth: 4,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 4,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  name: { ...text.body, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  count: { fontSize: 20, fontWeight: "700" },
  small: { fontSize: 12, color: colors.text },
  bold: { fontWeight: "600" },
  details: { marginTop: 4, gap: 2 },
});
