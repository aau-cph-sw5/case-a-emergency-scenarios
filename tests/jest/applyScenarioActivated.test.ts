import { describe, expect, it } from "@jest/globals";
import { applyScenarioActivated } from "../../shared/socket/useActivatedScenario";
import type { ScenarioActivated } from "../../shared/socket/events";
import type { Scenario } from "../../shared/types/v1/scenario";

function activation(scenarioId: string, sequence: number): ScenarioActivated {
  return { scenario: { scenarioId } as Scenario, sentAt: "", sequence };
}

// Delivers activations in and out of order, and checks that the steward ends on the newest either way.
describe("applyScenarioActivated", () => {
  it("applies the first activation", () => {
    const first = activation("DEMO-001", 1);
    expect(applyScenarioActivated(null, first)).toBe(first);
  });

  it("replaces the current activation with a newer one", () => {
    const newer = activation("DEMO-002", 2);
    expect(applyScenarioActivated(activation("DEMO-001", 1), newer)).toBe(
      newer,
    );
  });

  it("keeps the newer activation when an older one arrives after it", () => {
    const newer = activation("DEMO-002", 2);
    expect(applyScenarioActivated(newer, activation("DEMO-001", 1))).toBe(
      newer,
    );
  });

  it("keeps the current activation when the same one arrives again", () => {
    const current = activation("DEMO-002", 2);
    expect(applyScenarioActivated(current, activation("DEMO-002", 2))).toBe(
      current,
    );
  });

  it("ends on the newest whatever order they arrive in", () => {
    const applied = [3, 1, 2]
      .map((n) => activation(`DEMO-00${n}`, n))
      .reduce<ScenarioActivated | null>(applyScenarioActivated, null);
    expect(applied?.sequence).toBe(3);
    expect(applied?.scenario.scenarioId).toBe("DEMO-003");
  });
});
