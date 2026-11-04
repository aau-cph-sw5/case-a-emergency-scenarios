import { useLayoutEffect, useRef } from "react";
import { useLiveData } from "./data/liveData";

function ScenarioOrbit() {
  const orbitRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;
    const resize = () => {
      const { width: w, height: h } = orbit.getBoundingClientRect();
      const r = Math.min(12, w / 2, h / 2);
      // Start and finish at the resting dot, halfway down the label's left edge.
      const path = `M 0 ${h / 2} V ${h - r} Q 0 ${h} ${r} ${h} H ${w - r} Q ${w} ${h} ${w} ${h - r} V ${r} Q ${w} 0 ${w - r} 0 H ${r} Q 0 0 0 ${r} Z`;
      orbit.style.setProperty("--scenario-orbit-path", `path("${path}")`);
    };
    resize();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(orbit);
    return () => observer.disconnect();
  }, []);
  return <span ref={orbitRef} className="scenario-orbit" aria-hidden="true" />;
}

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
            <div className="active-scenario-label">
              <span>Aktivt scenarie</span>
              <strong>
                {names.get(active.scenarioId) ?? active.scenarioId}
              </strong>
              <ScenarioOrbit />
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
