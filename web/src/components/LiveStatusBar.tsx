import { Text } from "react-native";
import { useEffect, useState, type ReactNode } from "react";
import {
  countManned,
  countStewards,
} from "../../../shared/components/stationState";
import {
  formatDuration,
  formatTime,
} from "../../../shared/components/statusBar";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";

function Metric({
  label,
  value,
  total,
  tone,
  children,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
  children?: ReactNode;
}) {
  return (
    <section className={`operator-metric tone-${tone}`}>
      <h3 className="operator-eyebrow">{label}</h3>
      <div className="metric-value">
        <strong>{value}</strong>
        <span>af {total}</span>
      </div>
      <div
        className="metric-meter"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(total, value, 1)}
        aria-valuenow={value}
      >
        <span
          style={{
            width: `${total > 0 ? Math.min(value / total, 1) * 100 : 0}%`,
          }}
        />
      </div>
      {children}
    </section>
  );
}

// Presentation only: the existing coverage helpers determine all live totals.
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
      <p role={error ? "alert" : "status"}>
        <Text>{error ?? "Henter scenarie..."}</Text>
      </p>
    );
  const version = scenario.versions.find(
    (v) => v.version === scenario.currentVersion,
  );
  if (!version)
    return (
      <p role="alert">
        <Text>Scenariets aktuelle version blev ikke fundet.</Text>
      </p>
    );
  const requirements = version.stationRequirements;
  const covered = countManned(active, requirements);
  const stewards = countStewards(active, requirements);
  const missing = requirements.length - covered;
  const staffingTone =
    stewards.arrived >= stewards.needed
      ? "green"
      : stewards.arrived >= stewards.needed / 2
        ? "yellow"
        : "red";
  const shortageTone =
    missing === 0
      ? "green"
      : missing > requirements.length / 2
        ? "red"
        : "yellow";
  return (
    <div className="active-metrics" key={active.activationId}>
      <Metric
        label="STEWARDS PÅ STATIONER"
        value={stewards.arrived}
        total={stewards.needed}
        tone={staffingTone}
      >
        <p className="metric-note">{stewards.enRoute} på vej</p>
      </Metric>
      <Metric
        label="STATIONER DER MANGLER BEMANDING"
        value={missing}
        total={requirements.length}
        tone={shortageTone}
      />
      <section className="operator-metric scenario-information">
        <h3 className="operator-eyebrow">SCENARIO INFO</h3>
        <strong>
          <Text>
            {active.scenarioId} {scenario.name}
          </Text>
        </strong>
        <dl>
          <div>
            <dt>Aktiveret af</dt> <dd>{active.actor}</dd>
          </div>
          <div>
            <dt>Aktiv i</dt>
            <dd>{formatDuration(active.startedAt, now)}</dd>
          </div>
        </dl>
        <p
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
        </p>
      </section>
    </div>
  );
}
