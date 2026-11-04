import { useLiveData } from "./data/liveData";

// Always visible in the operator header; server state remains authoritative.
export function ActiveScenarioBanner() {
  const { activations, scenarios, error, isLoading } = useLiveData();
  const names = new Map((scenarios ?? []).map((s) => [s.scenarioId, s.name]));
  return (
    <aside
      className="active-scenario-banner"
      aria-label="Aktive scenarier"
      aria-live="polite"
    >
      {error !== null ? (
        <p role="alert">Kunne ikke hente aktive scenarier: {error}</p>
      ) : isLoading ? (
        <p role="status">Henter aktive scenarier.</p>
      ) : activations.length === 0 ? (
        <div className="active-scenario-item">
          <span className="active-scenario-dot" />
          <span>Ingen aktive scenarier</span>
        </div>
      ) : (
        activations.map((active) => (
          <div
            key={active.activationId}
            className="active-scenario-item is-running"
          >
            <span className="active-scenario-dot" />
            <div className="active-scenario-label">
              <span>Aktivt scenarie</span>
              <strong>
                {names.get(active.scenarioId) ?? active.scenarioId}
              </strong>
              <span className="scenario-orbit" aria-hidden="true" />
            </div>
            <time className="active-start-time" dateTime={active.startedAt}>
              {new Date(active.startedAt).toLocaleTimeString("da-DK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        ))
      )}
    </aside>
  );
}
