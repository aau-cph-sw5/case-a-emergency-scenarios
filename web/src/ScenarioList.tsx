import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import {
  box,
  colors,
  heading,
  palette,
  spacing,
  surface,
  text,
} from "../../shared/Theme";
import { filterScenarios } from "./filter-scenarios";
import { postJson, userMessage } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";
import { Button } from "./components/Button";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; scenarios: ScenarioSummary[] };

type ActivationState =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "error"; message: string }
  | { status: "done"; state: ScenarioState };

export function ScenarioList({ token }: { token: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ScenarioSummary | null>(null);
  const [activation, setActivation] = useState<ActivationState>({
    status: "idle",
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchScenarios(token, controller.signal).then(
      (scenarios) => setState({ status: "done", scenarios }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(error);
        setState({ status: "error", message: userMessage(error) });
      },
    );
    return () => controller.abort();
  }, [token]);

  async function activate(scenario: ScenarioSummary) {
    setSelected(null);
    setActivation({ status: "activating" });
    try {
      const state = await postJson(
        `/api/v1/scenarios/${encodeURIComponent(scenario.scenarioId)}/activate`,
        token,
        isScenarioState,
      );
      setActivation({ status: "done", state });
    } catch (error) {
      console.error(error);
      setActivation({ status: "error", message: userMessage(error) });
    }
  }

  // The search field is always shown, so it is there whenever the list is
  // longer than one screen (MET-A-007 criterion 1 / #116 criterion 3).
  return (
    <View role="region" aria-label="Nødscenarier">
      <Text role="heading" aria-level={2} style={heading}>
        Nødscenarier
      </Text>

      <Text style={styles.text}>Søg efter scenarier</Text>
      <TextInput
        role="searchbox"
        aria-label="Søg efter scenarier"
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      {state.status === "loading" && (
        <Text role="status" style={styles.text}>
          Henter scenarier…
        </Text>
      )}

      {state.status === "error" && (
        <Text role="alert" style={styles.text}>
          Kunne ikke hente scenarier: {state.message}
        </Text>
      )}

      {state.status === "done" &&
        (state.scenarios.length === 0 ? (
          <Text role="status" style={styles.text}>
            Ingen scenarier tilgængelige.
          </Text>
        ) : (
          <ScenarioResults
            scenarios={filterScenarios(state.scenarios, query)}
            query={query}
            onSelect={setSelected}
            disabled={activation.status === "activating"}
          />
        ))}

      {selected && (
        <ConfirmActivation
          scenario={selected}
          onConfirm={() => activate(selected)}
          onCancel={() => setSelected(null)}
        />
      )}

      <ActivationStatus activation={activation} />
    </View>
  );
}

function ActivationStatus({ activation }: { activation: ActivationState }) {
  switch (activation.status) {
    case "idle":
      return null;
    case "activating":
      return (
        <Text role="status" style={styles.text}>
          Aktiverer scenarie…
        </Text>
      );
    case "error":
      return (
        <Text role="alert" style={styles.text}>
          Kunne ikke aktivere scenariet: {activation.message}
        </Text>
      );
    case "done":
      return (
        <Text role="status" style={styles.text}>
          Scenarie {activation.state.scenarioId} er {activation.state.status},
          startet {activation.state.startedAt} af {activation.state.actor}.
        </Text>
      );
  }
}

function ScenarioResults({
  scenarios,
  query,
  onSelect,
  disabled,
}: {
  scenarios: ScenarioSummary[];
  query: string;
  onSelect: (scenario: ScenarioSummary) => void;
  disabled: boolean;
}) {
  // No match is an empty list, not an error.
  if (scenarios.length === 0) {
    return (
      <Text role="status" style={styles.text}>
        Ingen scenarier matcher “{query.trim()}”.
      </Text>
    );
  }
  return (
    <View role="list" style={styles.list}>
      {scenarios.map((scenario) => (
        <View role="listitem" key={scenario.scenarioId}>
          <Button
            label={scenario.name}
            onPress={() => onSelect(scenario)}
            disabled={disabled}
          />
        </View>
      ))}
    </View>
  );
}

// A modal traps focus and closes on Escape (onRequestClose), which counts as
// Cancel. Nothing is activated unless Confirm is pressed (MET-A-007, criterion 2).
function ConfirmActivation({
  scenario,
  onConfirm,
  onCancel,
}: {
  scenario: ScenarioSummary;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent visible onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View role="dialog" aria-modal style={styles.dialog}>
          <Text role="heading" aria-level={3} style={heading}>
            Aktivér “{scenario.name}”?
          </Text>
          <View style={styles.buttons}>
            <Button label="Bekræft" onPress={onConfirm} />
            <Button label="Annullér" onPress={onCancel} secondary />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.text },
  input: {
    ...box,
    ...text.header,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  list: { gap: spacing.xs },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.scrim,
  },
  dialog: { ...surface, ...box, padding: spacing.lg, gap: spacing.sm },
  buttons: { flexDirection: "row", gap: spacing.xs },
});
