import { useCallback, useEffect, useState } from "react";
import { getJson } from "./get-json";
import ScenarioStationList from "../../shared/components/stationView";
import type { Scenario } from "../../shared/types/v1/scenario";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { ScenarioList } from "./ScenarioList";
import { StewardPositions } from "./components/StewardPositions";
import { OperatorSections } from "./components/OperatorSections";
import { isActivationList } from "./activations";

type Active = { scenario: Scenario; state: ScenarioState };

function isScenario(data: unknown): data is Scenario {
  const s = data as Partial<Scenario> | null;
  const current = Array.isArray(s?.versions)
    ? s.versions.find((v) => v?.version === s.currentVersion)
    : undefined;
  return (
    typeof s?.scenarioId === "string" &&
    typeof s.name === "string" &&
    Array.isArray(current?.stationRequirements) &&
    current.stationRequirements.every(
      (r) =>
        typeof r?.station === "string" && typeof r.minimumStaffing === "number",
    )
  );
}

// The control-room dashboard. App opens the socket. Each section is filled by
// its own sub-issue of MET-A-011, so the dashboard keeps working until then.
export function OperatorDashboard({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  // The latest activated scenario; null until one is active.
  const [active, setActive] = useState<Active | null>(null);

  // The scenario holds the stations; its activation holds the deployments.
  const showActivated = useCallback(
    async (scenarioId: string) => {
      const [scenario, activations] = await Promise.all([
        getJson(
          `/api/v1/scenarios/${encodeURIComponent(scenarioId)}`,
          token,
          isScenario,
        ),
        getJson("/api/v1/activations?status=ACTIVE", token, isActivationList),
      ]);
      const state = activations
        .filter((a) => a.scenarioId === scenarioId)
        .at(-1);
      if (state) setActive({ scenario, state });
    },
    [token],
  );

  // Shows what scenario is already active.
  useEffect(() => {
    getJson("/api/v1/activations?status=ACTIVE", token, isActivationList)
      .then((list) => {
        const latest = list.at(-1);
        if (latest) return showActivated(latest.scenarioId);
      })
      .catch(console.error);
  }, [token, showActivated]);

  return (
    <main>
      <button onClick={onLogout} type="button">
        Log ud
      </button>
      <OperatorSections
        scenarioSelection={
          <ScenarioList
            token={token}
            onActivated={(id) => showActivated(id).catch(console.error)}
          />
        }
        map={<p>Insert map here...</p>}
        coverage={
          active ? (
            <ScenarioStationList
              scenario={active.scenario}
              activeDeployments={active.state}
            />
          ) : (
            <p>Intet aktivt scenarie.</p>
          )
        }
      />
      {/* Fixed in the bottom right corner, so it follows the wireframe whatever
          the section layout does. */}
      <div className="status-popup">
        {/* TEMPORARY: mock shows hardcoded rows. Remove the prop for live data. */}
        <StewardPositions mock={import.meta.env.DEV} />
      </div>
    </main>
  );
}
