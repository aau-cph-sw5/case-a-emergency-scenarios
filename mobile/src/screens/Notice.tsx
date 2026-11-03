import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ActiveScenarioView } from "../../../shared/offline/use-active-scenario";
import { box, colors, palette } from "../../../shared/Theme";

// Tells the steward that the scenario was activated, switched or stood down

export function ScenarioNotice({
  view,
  onDismiss,
}: {
  view: ActiveScenarioView;
  onDismiss: () => void;
}) {
  if (view.status === "stood-down") {
    return (
      <Notice title="Scenariet er afsluttet" onDismiss={onDismiss}>
        “{view.scenarioName}” er deaktiveret af kontrolrummet. Genoptag normal
        drift.
      </Notice>
    );
  }
  if (view.status !== "live" || view.notice === undefined) return null;
  const { name } = view.snapshot.scenario;
  return view.notice.kind === "activated" ? (
    <Notice title="Nyt scenarie aktiveret" onDismiss={onDismiss}>
      “{name}” er aktiveret af kontrolrummet.
    </Notice>
  ) : (
    <Notice title="Scenariet er skiftet" onDismiss={onDismiss}>
      “{view.notice.from}” er afløst af “{name}”.
    </Notice>
  );
}

function Notice({
  title,
  children,
  onDismiss,
}: {
  title: string;
  children: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{children}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onDismiss}
        style={styles.button}
      >
        <Text style={styles.buttonText}>OK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: palette.metroDeepRed,
    borderRadius: 4,
    marginBottom: 12,
    padding: 12,
  },
  title: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: "700",
  },
  text: {
    color: colors.textInverse,
    marginTop: 4,
  },
  button: {
    ...box,
    alignSelf: "flex-start",
    borderColor: colors.textInverse,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: "600",
  },
});
