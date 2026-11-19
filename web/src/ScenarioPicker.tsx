import { useRef, useState, type AnimationEvent } from "react";
import { ScenarioResults } from "./ScenarioResults";
import type { ScenarioSummary } from "./scenarios";

// True when the picker's own exit animation has ended (not a child's).
function isExitEnd(event: AnimationEvent<HTMLElement>) {
  return (
    event.target === event.currentTarget &&
    event.animationName === "scenario-picker-out"
  );
}

// "Vælg scenarie": the operator picks a scenario from the list and can search
// it by name or by a station the scenario covers.
export function ScenarioPicker({
  scenarios,
  scenariosError,
  reloadScenarios,
  selectedId,
  activeIds,
  activeFailed,
  busy,
  hidden,
  closing,
  onSelect,
  onExitEnd,
}: {
  // Not used yet: the suggestion box that follows needs it to ask the server.
  token: string;
  scenarios: ScenarioSummary[] | null;
  scenariosError: string | null;
  reloadScenarios: () => void;
  selectedId: string | null;
  activeIds: ReadonlySet<string>;
  activeFailed: boolean;
  busy: boolean;
  hidden: boolean;
  closing: boolean;
  onSelect: (scenarioId: string | null) => void;
  onExitEnd: () => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // A scenario that is running hides the picker; the next visit starts clean.
  // Adjusted while rendering, as React recommends for state that follows a prop.
  const [wasHidden, setWasHidden] = useState(hidden);
  if (hidden !== wasHidden) {
    setWasHidden(hidden);
    if (hidden) setQuery("");
  }

  return (
    <div
      className="scenario-picker"
      hidden={hidden}
      onAnimationEnd={(event) => {
        if (closing && isExitEnd(event)) onExitEnd();
      }}
    >
      <h2 id="scenario-list-heading">Vælg scenarie</h2>

      <label htmlFor="scenario-search" className="suggest-label">
        Søg efter scenarie
      </label>
      <div className="scenario-search">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M13 13l4 4" />
        </svg>
        <input
          ref={searchRef}
          id="scenario-search"
          type="search"
          placeholder="Navn eller station"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {scenarios === null && scenariosError === null && (
        <p role="status">Henter scenarier…</p>
      )}

      {scenariosError !== null && (
        <>
          <p role="alert">Kunne ikke hente scenarier: {scenariosError}</p>
          <button type="button" onClick={reloadScenarios}>
            Prøv igen
          </button>
        </>
      )}

      {scenarios !== null &&
        (scenarios.length === 0 ? (
          <p role="status">Ingen scenarier tilgængelige.</p>
        ) : (
          <ScenarioResults
            scenarios={scenarios}
            query={query}
            selectedId={selectedId}
            activeIds={activeIds}
            onSelect={onSelect}
            disabled={busy}
          />
        ))}

      {activeFailed && (
        <p role="status" className="scenario-notice">
          Aktive scenarier kunne ikke vises.
        </p>
      )}
    </div>
  );
}
