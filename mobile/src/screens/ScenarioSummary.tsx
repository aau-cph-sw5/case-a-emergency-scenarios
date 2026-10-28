import { StyleSheet, Text, View } from "react-native";
import type { ScenarioSnapshot } from "../../../shared/offline/scenario-snapshot";
import { box, colors, surface, text } from "../../../shared/Theme";

// "07:00:00" as "07:00"; the seconds are always zero in a manning window.
const hoursAndMinutes = (time: string) => time.slice(0, 5);

// Plain-text overview of the active scenario, live or from the saved copy.
// The graphical overview from #157 replaces this view.
export function ScenarioSummary({ snapshot }: { snapshot: ScenarioSnapshot }) {
  const { scenario } = snapshot;
  // The copy keeps only the current version, or none if the server had none.
  const version = scenario.versions[0];
  const where = (scenario.covers ?? [])
    .map((segment) => `${segment.stationA} - ${segment.stationB}`)
    .join(", ");

  return (
    <View>
      <Text style={styles.title}>{scenario.name}</Text>
      {where !== "" && <Text style={styles.body}>Strækning: {where}</Text>}

      <Text style={styles.heading}>Stationer der skal bemandes</Text>
      {(version?.stationRequirements ?? []).map((requirement) => (
        <View
          key={`${requirement.station}-${requirement.placement}`}
          style={styles.card}
        >
          <Text style={styles.strong}>
            {requirement.station} · {requirement.minimumStaffing} påkrævet
          </Text>
          <Text style={styles.body}>{requirement.placement}</Text>
          <Text style={styles.body}>
            {requirement.activeDuring && requirement.activeDuring.length > 0
              ? `Bemandes ${requirement.activeDuring
                  .map(
                    (window) =>
                      `${window.dayPattern} ${hoursAndMinutes(window.startTime)}-${hoursAndMinutes(window.endTime)}`,
                  )
                  .join(", ")}`
              : "Bemandes hele tiden"}
          </Text>
          {[...(requirement.actions ?? [])]
            .sort((a, b) => a.sequence - b.sequence)
            .map((action) => (
              <Text key={action.sequence} style={styles.body}>
                {action.sequence}. {action.instruction}
              </Text>
            ))}
        </View>
      ))}

      {version?.passengerInformation &&
        version.passengerInformation.length > 0 && (
          <>
            <Text style={styles.heading}>Passagerinformation</Text>
            {version.passengerInformation.map((information) => (
              <View
                key={`${information.channel}-${information.language}`}
                style={styles.card}
              >
                <Text style={styles.strong}>
                  {information.channel} · {information.language}
                </Text>
                <Text style={styles.body}>{information.message}</Text>
              </View>
            ))}
          </>
        )}
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
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  body: {
    ...text.body,
    color: colors.text,
  },
  strong: {
    ...text.body,
    color: colors.text,
    fontWeight: "600",
  },
  card: {
    ...surface,
    ...box,
    gap: 2,
    marginBottom: 6,
  },
});
