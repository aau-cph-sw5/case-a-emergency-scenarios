import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { LiveCoverage } from "../../web/src/components/LiveCoverage";
import { LiveDataContext, type LiveData } from "../../web/src/data/liveData";

const scenario: Scenario = {
  scenarioId: "TEST-001",
  name: "Coverage test",
  currentVersion: "1",
  versions: [
    {
      version: "1",
      revision: "Test revision",
      operatingPlan: { name: "Test plan", patterns: [] },
      stationRequirements: [
        { station: "Station A", placement: "Platform", minimumStaffing: 2 },
      ],
    },
  ],
};

function activation(deployments: ScenarioState["deployments"]): ScenarioState {
  return {
    activationId: "activation-1",
    scenarioId: "TEST-001",
    startedAt: "2026-10-29T12:00:00Z",
    status: "ACTIVE",
    actor: "operator-test",
    sequence: 1,
    deployments,
  };
}

// The data layer as LiveDataProvider would hand it out, without a server.
function withLive(live: Partial<LiveData>) {
  const value = {
    live: {
      activations: [],
      scenarios: [],
      isConnected: true,
      isLoading: false,
      lastUpdatedAt: null,
      error: null,
      scenariosError: null,
      reloadScenarios: () => {},
      ...live,
    },
    loadScenario: async () => scenario,
  };
  return (
    <LiveDataContext value={value}>
      <LiveCoverage />
    </LiveDataContext>
  );
}

describe("LiveCoverage", () => {
  it("says so when no scenario is active", () => {
    render(withLive({ activations: [] }));

    expect(screen.getByText("Intet aktivt scenarie.")).toBeTruthy();
  });

  it("updates the station when the data layer receives new activations", async () => {
    const view = render(
      withLive({
        activations: [
          activation([{ fulfills: "Station A", status: "PENDING" }]),
        ],
      }),
    );
    expect(await screen.findByText("0/2")).toBeTruthy();
    expect(screen.getByText("1 på vej")).toBeTruthy();

    view.rerender(
      withLive({
        activations: [
          activation([
            { fulfills: "Station A", status: "MANNED" },
            { fulfills: "Station A", status: "MANNED" },
          ]),
        ],
      }),
    );
    expect(await screen.findByText("2/2")).toBeTruthy();
    expect(screen.getByText("Fuldt bemandet")).toBeTruthy();
  });

  it("says that coverage may be out of date while the socket is down", async () => {
    render(withLive({ activations: [activation([])], isConnected: false }));

    expect(
      await screen.findByText(
        "Forbindelsen er afbrudt. Dækningen kan være forældet.",
      ),
    ).toBeTruthy();
  });
});
