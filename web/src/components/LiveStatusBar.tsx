import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  formatDuration,
  formatTime,
} from "../../../shared/components/statusBar";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";

// The active scenario, in the map's top-left corner: its name, how long it
// has run, who activated it and when the data last arrived. The station colours carry the
// coverage, so the card holds no counts.
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
      <div className="active-scenario-card" role={error ? "alert" : "status"}>
        <Text>{error ?? "Henter scenarie..."}</Text>
      </div>
    );
  if (!scenario.versions.some((v) => v.version === scenario.currentVersion))
    return (
      <div className="active-scenario-card" role="alert">
        <Text>Scenariets aktuelle version blev ikke fundet.</Text>
      </div>
    );
  const stale = !isConnected || liveError !== null;
  return (
    <section
      className="active-scenario-card"
      aria-label="Aktivt scenarie"
      key={active.activationId}
    >
      <header>
        <span className="active-scenario-eyebrow">
          <span className="active-scenario-dot" aria-hidden="true" />
          Aktivt scenarie
        </span>
        <h2>
          <Text>{scenario.name}</Text>
        </h2>
      </header>
      <dl>
        <div>
          <dt>Tid aktivt</dt>
          <dd className="active-scenario-duration">
            <Text>{formatDuration(active.startedAt, now)}</Text>
          </dd>
        </div>
        <div>
          <dt>Aktiveret af</dt>
          <dd>
            <Text>{active.actor}</Text>
          </dd>
        </div>
        <div>
          <dt>Sidst opdateret</dt>
          <dd>
            <Text>{formatTime(lastUpdatedAt?.toISOString())}</Text>
          </dd>
        </div>
      </dl>
      {stale && (
        <p className="connection-state is-offline" role="status">
          <Text>
            {!isConnected
              ? "⚠ Forbindelsen er afbrudt · informationen kan være forældet"
              : `Kunne ikke opdatere: ${liveError}`}
          </Text>
        </p>
      )}
    </section>
  );
}
