import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { LiveStatusBar } from "../../web/src/components/LiveStatusBar";
import { LiveDataContext } from "../../web/src/data/liveData";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";

const scenario = {
  scenarioId: "DEMO-001",
  name: "Demo scenario",
  currentVersion: "1",
  versions: [
    {
      version: "1",
      stationRequirements: [
        { station: "Station A", placement: "Platform", minimumStaffing: 2 },
        { station: "Station B", placement: "Platform", minimumStaffing: 1 },
      ],
    },
  ],
} as unknown as Scenario;

function activation(overrides: Partial<ScenarioState> = {}): ScenarioState {
  return {
    activationId: "ACT-001",
    scenarioId: "DEMO-001",
    startedAt: "2026-10-22T10:00:00Z",
    status: "ACTIVE",
    actor: "operator-001",
    sequence: 1,
    deployments: [],
    ...overrides,
  };
}

function renderWith(
  activations: ScenarioState[],
  loadScenario: (id: string) => Promise<Scenario>,
  isConnected = true,
) {
  const value = {
    live: {
      activations: activations,
      scenarios: null,
      isConnected: isConnected,
      isLoading: false,
      lastUpdatedAt: null,
      error: null,
      scenariosError: null,
      reloadScenarios: () => {},
    },
    loadScenario: loadScenario,
  };
  render(
    <LiveDataContext value={value}>
      <LiveStatusBar />
    </LiveDataContext>,
  );
}
describe("LiveStatusBar", () => {
  it("shows nothing while no scenario is active", () => {
    renderWith([], async () => {
      throw new Error("not needed");
    });
    expect(screen.toJSON()).toBeNull();
  });

  it("shows the scenario name when a scenario is active", async () => {
    renderWith([activation()], async () => scenario);

    await screen.findByText("DEMO-001 Demo scenario");
  });

  it("says it is loading while the scenario has not arrived", () => {
    renderWith([activation()], () => new Promise(() => {}));

    screen.getByText("Henter scenarie...");
  });
  it("shows an error when the scenario cannot be loaded", async () => {
    renderWith([activation()], async () => {
      throw new Error("network down");
    });

    await screen.findByText("Ingen forbindelse til serveren. Prøv igen.");
  });
  it("connection was lost", async () => {
    renderWith([activation()], async () => scenario, false);
    await screen.findByText("⚠ Disconnected · data may be out of date");
  });

  it("shows the most recently activated scenario", async () => {
    const asked: string[] = [];

    renderWith(
      [activation({ scenarioId: "OLD" }), activation()],
      async (id) => {
        asked.push(id);
        return scenario;
      },
    );

    await screen.findByText("DEMO-001 Demo scenario");
    expect(asked).toEqual(["DEMO-001"]);
  });
});
