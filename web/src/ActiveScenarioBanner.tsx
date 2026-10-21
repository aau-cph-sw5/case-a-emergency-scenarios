import { useEffect, useState } from "react";
import { fetchActiveActivations } from "./activations";
import { userMessage } from "./get-json";
import type { ScenarioState } from "./scenario-state";
import "./active-scenario-banner.css";

// ponytail: polls; swap for a socket event when the server emits one.
const POLL_MS = 5000;

// Shown by App above every view, so an active scenario is visible wherever
// the operator is (MET-A-007 criterion 3). Shows scenarioId until the list
// endpoint also returns the scenario name and line.
export function ActiveScenarioBanner({ token }: { token: string }) {
  const [active, setActive] = useState<ScenarioState[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        setActive(await fetchActiveActivations(token, controller.signal));
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
        setError(userMessage(e));
      }
    }
    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [token]);

  return (
    <aside className="active-scenario-banner" aria-label="Aktive scenarier">
      {error !== null ? (
        <p role="alert">
          <span className="dot idle" />
          Kunne ikke hente aktive scenarier: {error}
        </p>
      ) : active.length === 0 ? (
        <p role="status">
          <span className="dot idle" />
          Ingen aktive scenarier
        </p>
      ) : (
        <ul>
          {active.map((a) => (
            <li key={a.scenarioId}>
              <span className="dot" />
              <span>
                Aktivt scenarie <strong>{a.scenarioId}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
