import { StyleSheet, Text, View } from "react-native";
import { parseStationRequirements } from "../../../shared/ScenarioParser";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { box, colors, surface, text } from "../../../shared/Theme";

type StationRow = {
  station: string;
  placement: string;
  staff: number;
  times: string[];
  actions: string[];
};

// Plain-text overview of the active scenario. The graphical overview from
// #157 replaces this view.
export function ScenarioSummary({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const { scenario, state, userId } = snapshot;
  // The snapshot keeps only the current version; if the server had none,
  // there is nothing to list (and the parser would throw).
  const rows =
    scenario.versions.length > 0
      ? (parseStationRequirements(scenario) as StationRow[])
      : [];
  const where = (scenario.covers ?? [])
    .map((segment) => `${segment.stationA} – ${segment.stationB}`)
    .join(", ");
  const ownAssignment = state.deployments.find(
    (deployment) => deployment.staff === userId,
  );

  return (
    <View>
      <Text style={styles.title}>{scenario.name}</Text>
      {where !== "" && <Text style={styles.body}>Hvor: {where}</Text>}

      {ownAssignment && (
        <Text style={styles.body}>Din opgave: {ownAssignment.fulfills}</Text>
      )}

      <Text style={styles.heading}>Påvirkede stationer</Text>
      {rows.map((row) => (
        <View
          key={`${row.station}-${row.placement}-${row.times.join(",")}`}
          style={styles.station}
        >
          <Text style={styles.stationName}>
            {row.station} · {row.staff} påkrævet
          </Text>
          <Text style={styles.body}>{row.placement}</Text>
          <Text style={styles.body}>
            {row.times.length > 0
              ? `Bemandes: ${row.times.join(", ")}`
              : "Bemandes hele tiden"}
          </Text>
          {row.actions.length > 0 && (
            <Text style={styles.body}>
              {row.actions
                .map((action, index) => `${index + 1}. ${action}`)
                .join("\n")}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...text.title,
    color: colors.text,
    marginBottom: 4,
  },
  heading: {
    ...text.header,
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  body: {
    ...text.body,
    color: colors.text,
  },
  station: {
    ...surface,
    ...box,
    marginBottom: 6,
  },
  stationName: {
    ...text.body,
    color: colors.text,
    fontWeight: "600",
  },
});
