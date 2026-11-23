import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { ScenarioResults } from "./ScenarioResults";
import { ScenarioSuggestions } from "./ScenarioSuggestions";
import type { ScenarioSummary } from "./scenarios";

// True when the picker's own exit animation has ended (not a child's).
function isExitEnd(event: AnimationEvent<HTMLElement>) {
  return (
    event.target === event.currentTarget &&
    event.animationName === "scenario-picker-out"
  );
}

// "Vælg scenarie": two routes to a scenario, one shown at a time: pick it from
// the list, or describe the incident. Both stay mounted, so the description and
// its suggestions survive a switch to the list and back.
export function ScenarioPicker({
  token,
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
  const [mode, setMode] = useState<"describe" | "list">("list");
  const searchRef = useRef<HTMLInputElement>(null);
  // Set when "Gå til listen" is pressed in the describe tab: the search field is
  // hidden until the tab has switched, so focus it after the render.
  const focusSearchRef = useRef(false);

  useEffect(() => {
    if (mode === "list" && focusSearchRef.current) {
      focusSearchRef.current = false;
      searchRef.current?.focus();
    }
  }, [mode]);

  // A scenario that is running hides the picker; the next visit starts clean.
  // Adjusted while rendering, as React recommends for state that follows a prop.
  const [wasHidden, setWasHidden] = useState(hidden);
  if (hidden !== wasHidden) {
    setWasHidden(hidden);
    if (hidden) setQuery("");
  }

  function goToList() {
    if (mode === "list") searchRef.current?.focus();
    else {
      focusSearchRef.current = true;
      setMode("list");
    }
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

      <div
        className="operator-line-switcher scenario-mode"
        role="group"
        aria-label="Vælg på"
      >
        <button
          type="button"
          aria-pressed={mode === "list"}
          onClick={() => setMode("list")}
        >
          Vælg fra liste
        </button>
        <button
          type="button"
          aria-pressed={mode === "describe"}
          onClick={() => setMode("describe")}
        >
          Beskriv hændelse
        </button>
      </div>

      <div hidden={mode !== "describe"}>
        <ScenarioSuggestions
          token={token}
          scenarios={scenarios ?? []}
          selectedId={selectedId}
          onSelect={onSelect}
          onNoCandidate={() => setQuery("")}
          onGoToList={goToList}
          disabled={busy}
        />
      </div>

      <div hidden={mode !== "list"}>
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

      <div hidden={mode !== "list"}>
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
      </div>

      {activeFailed && (
        <p role="status" className="scenario-notice">
          Aktive scenarier kunne ikke vises.
        </p>
      )}
    </div>
  );
}
