import { useState } from "react";
import { postJson, userMessage } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";
import type { ScenarioSummary } from "./scenarios";
import { canActivate } from "./selection";

export type ActivationState =
  | { status: "idle" }
  | { status: "activating" }
  | { status: "standing-down" }
  | { status: "error"; message: string }
  | { status: "done"; scenarioId: string }
  | { status: "stood-down" };

// Activating and standing down a scenario, with the state of the request.
export function useActivation({
  token,
  activations,
  previewReady,
  onActivated,
  onStoodDown,
}: {
  token: string;
  activations: ScenarioState[];
  previewReady: boolean;
  onActivated: (scenarioId: string) => void;
  onStoodDown: () => void;
}) {
  const [activation, setActivation] = useState<ActivationState>({
    status: "idle",
  });

  async function activate(
    scenario: ScenarioSummary,
    busy: boolean,
    activeIds: ReadonlySet<string>,
  ) {
    if (!previewReady || !canActivate(scenario.scenarioId, busy, activeIds))
      return;
    setActivation({ status: "activating" });
    // While another scenario is active this is a switch: replaces names the
    // activation the operator confirmed to stand down
    const outgoing = activations.find(
      (a) => a.scenarioId !== scenario.scenarioId,
    );
    try {
      const state = await postJson(
        `/api/v1/scenarios/${encodeURIComponent(scenario.scenarioId)}/activate`,
        token,
        isScenarioState,
        outgoing && { replaces: outgoing.activationId },
      );
      setActivation({ status: "done", scenarioId: state.scenarioId });
      onActivated(state.scenarioId);
    } catch (error) {
      console.error(error);
      setActivation({
        status: "error",
        message: `Kunne ikke aktivere scenariet: ${userMessage(error)}`,
      });
    }
  }

  // The server sends "activations-changed" afterwards, so the dot and the
  // banner update by themselves
  async function standDown(scenario: ScenarioSummary) {
    const active = activations.find(
      (a) => a.scenarioId === scenario.scenarioId,
    );
    if (active === undefined) return;
    setActivation({ status: "standing-down" });
    try {
      await postJson(
        `/api/v1/activations/${active.activationId}/stand-down`,
        token,
        isScenarioState,
      );
      setActivation({ status: "stood-down" });
      onStoodDown();
    } catch (error) {
      console.error(error);
      setActivation({
        status: "error",
        message: `Kunne ikke deaktivere scenariet: ${userMessage(error)}`,
      });
    }
  }

  return { activation, activate, standDown };
}
