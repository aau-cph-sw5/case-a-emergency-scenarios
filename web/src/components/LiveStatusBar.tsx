import { Text } from "react-native";
import { useEffect, useState } from "react";
import {
  formatDuration,
  formatTime,
} from "../../../shared/components/statusBar";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";

// Presentation only: the left column of the active-scenario view (operator tasks, then the scenario info with the running clock).
export function LiveStatusBar() {
  const {
    activations,
    isConnected,
    lastUpdatedAt,
    error: liveError,
  } = useLiveData();
  const active = activations.at(-1) ?? null;
  const { scenario, error } = useScenario(active?.scenarioId ?? null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (active === null) return null;
  if (scenario === null)
    return (
      <div role={error ? "alert" : "status"}>
        <Text>{error ?? "Henter scenarie..."}</Text>
      </div>
    );
  const version = scenario.versions.find(
    (v) => v.version === scenario.currentVersion,
  );
  if (!version)
    return (
      <div role="alert">
        <Text>Scenariets aktuelle version blev ikke fundet.</Text>
      </div>
    );
  return (
    <div className="active-metrics" key={active.activationId}>
      {/* Design rationale: the two staffing numbers were two cards that the
          Bemandingsplan header now repeats, so they are gone. The card stays,
          empty, as the place for the operator's own tasks. */}
      <section
        className="operator-metric operator-tasks"
        aria-label="Operator opgaver"
      >
        <h3 className="operator-eyebrow">OPERATOR OPGAVER</h3>
        <p className="operator-tasks-note">Operator opgaver kommer her</p>
      </section>
      {/* Design rationale: the running clock is what an operator checks most
          often, so it comes first and is the largest thing on the card. Then
          which scenario, who started it and when, then the live state of the
          connection last, as a quiet footer. Order follows how the questions
          come up: how long, what, who, when, can I trust it. */}
      <section className="operator-metric scenario-information">
        <h3 className="operator-eyebrow">SCENARIO INFO</h3>
        <div className="scenario-clock">
          <span className="scenario-clock-label">Aktiv i</span>
          <strong className="scenario-clock-time">
            {formatDuration(active.startedAt, now)}
          </strong>
        </div>
        <dl>
          <div>
            <dt>Scenarie</dt>
            <dd>
              <Text>
                {active.scenarioId} {scenario.name}
              </Text>
            </dd>
          </div>
          <div>
            <dt>Aktiveret af</dt> <dd>{active.actor}</dd>
          </div>
          <div>
            <dt>Aktiveret kl.</dt>
            <dd>{formatTime(active.startedAt)}</dd>
          </div>
        </dl>
        <div
          className={`connection-state ${!isConnected || liveError ? "is-offline" : ""}`}
          role="status"
        >
          <Text>
            {!isConnected
              ? "⚠ Forbindelsen er afbrudt · informationen kan være forældet"
              : liveError
                ? `Kunne ikke opdatere: ${liveError}`
                : `Live · opdateret ${formatTime(lastUpdatedAt?.toISOString())}`}
          </Text>
        </div>
      </section>
    </div>
  );
}
