import { useEffect, useState } from "react";
import { fetchActiveActivations } from "./activations";
import { describeCovers } from "./lines";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";
import { userMessage } from "./get-json";
import type { ScenarioState } from "./scenario-state";
import "./active-scenario-banner.css";

// ponytail: polls; swap for a socket event when the server emits one.
const POLL_MS = 5000;

// "14.32", with the date in front when it is not today.
function startedLabel(startedAt: string) {
  const date = new Date(startedAt);
  const time = date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return date.toDateString() === new Date().toDateString()
    ? time
    : `${date.toLocaleDateString("da-DK")} ${time}`;
}

// Shown by App above every view, so an active scenario is visible wherever
// the operator is (MET-A-007 criterion 3). Shows the scenario name, falling
// back to scenarioId; the line is not shown yet.
export function ActiveScenarioBanner({
  token,
  refresh,
}: {
  token: string;
  refresh: number;
}) {
  const [active, setActive] = useState<ScenarioState[]>([]);
  const [names, setNames] = useState<Map<string, ScenarioSummary>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [activations, scenarios] = await Promise.all([
          fetchActiveActivations(token, controller.signal),
          fetchScenarios(token, controller.signal),
        ]);
        setNames(new Map(scenarios.map((s) => [s.scenarioId, s])));
        setActive(activations);
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
  }, [token, refresh]);

  // ISO timestamps sort as text; the numbering is the order of activation.
  const oldestFirst = [...active].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );

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
          {oldestFirst.map((a, i) => (
            <li key={a.scenarioId}>
              <span className="dot" />
              <span className="info">
                <strong>{names.get(a.scenarioId)?.name ?? a.scenarioId}</strong>
                <span>
                  Aktivt scenarie {i + 1}. · {startedLabel(a.startedAt)}
                </span>
                {describeCovers(names.get(a.scenarioId)?.covers).map((c) => (
                  <small key={c}>{c}</small>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
