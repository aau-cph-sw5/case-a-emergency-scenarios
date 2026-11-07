import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  formatDuration,
  formatTime,
} from "../../../shared/components/statusBar";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";

// The active scenario, in the map's top-left corner: its name, how long it
// has run and when the data last arrived. The station colours carry the
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
      <h2>
        <span className="active-scenario-dot" aria-hidden="true" />
        <Text>Aktivt scenarie: {scenario.name}</Text>
      </h2>
      <dl>
        <div>
          <dt>Tid aktivt:</dt>
          <dd>
            <Text>{formatDuration(active.startedAt, now)}</Text>
          </dd>
        </div>
        <div>
          <dt>Sidst opdateret:</dt>
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
