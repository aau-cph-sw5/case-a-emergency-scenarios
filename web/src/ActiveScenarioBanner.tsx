import { useEffect, useState } from "react";
import { fetchActiveActivations } from "./activations";
import { describeCovers } from "./lines";
import { fetchScenarios, type ScenarioSummary } from "./scenarios";
import { socket } from "./socket";
import { userMessage } from "./get-json";
import type { ScenarioState } from "./scenario-state";

// The socket tells the banner when an activation happens. The poll is the
// fallback for a dropped socket or an event missed while offline.
const POLL_MS = 30_000;

function startedLabel(startedAt: string) {
  return new Date(startedAt).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Shown by App above every view, so an active scenario is visible wherever
// the operator is (MET-A-007 criterion 3). Shows the scenario name, falling
// back to scenarioId; the line is not shown yet.
export function ActiveScenarioBanner({ token }: { token: string }) {
  const [active, setActive] = useState<ScenarioState[]>([]);
  const [names, setNames] = useState<Map<string, ScenarioSummary>>(
    () => new Map(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Only the newest load may set state, so a slow older one cannot
    // overwrite a newer answer.
    let latest = 0;
    async function load() {
      const mine = ++latest;
      try {
        const [activations, scenarios] = await Promise.all([
          fetchActiveActivations(token, controller.signal),
          fetchScenarios(token, controller.signal),
        ]);
        if (mine !== latest) return;
        setNames(new Map(scenarios.map((s) => [s.scenarioId, s])));
        setActive(activations);
        setError(null);
      } catch (e) {
        if (controller.signal.aborted || mine !== latest) return;
        console.error(e);
        setError(userMessage(e));
      }
    }
    const timer = setInterval(load, POLL_MS);
    socket.auth = { token };
    socket.connect();
    // "connect" also fires on a reconnect, which catches up on missed events.
    socket.on("connect", load);
    socket.on("activations-changed", load);
    load();
    return () => {
      controller.abort();
      clearInterval(timer);
      socket.off("connect", load);
      socket.off("activations-changed", load);
      socket.disconnect();
    };
  }, [token]);

  // ISO timestamps sort as text; the numbering is the order of activation.
  const oldestFirst = [...active].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );

  return (
    <aside aria-label="Aktive scenarier">
      {error !== null ? (
        <p role="alert">Kunne ikke hente aktive scenarier: {error}</p>
      ) : active.length === 0 ? (
        <p role="status">Ingen aktive scenarier</p>
      ) : (
        <ul>
          {oldestFirst.map((a, i) => (
            <li key={a.scenarioId}>
              <strong>{names.get(a.scenarioId)?.name ?? a.scenarioId}</strong>{" "}
              Aktivt scenarie {i + 1}. · {startedLabel(a.startedAt)}{" "}
              {describeCovers(names.get(a.scenarioId)?.covers).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
