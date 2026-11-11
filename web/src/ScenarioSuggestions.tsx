import { useEffect, useRef, useState } from "react";
import { userMessage } from "./get-json";
import { fetchSuggestions, type Suggestions } from "./suggestions";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: Suggestions };

const MAX_LENGTH = 2000; // contracts/v1/scenario-suggestion.schema.json

// Suggests scenarios for a free-text description. A suggestion only selects
// the scenario: activating still goes through "Aktivér valgt scenarie" and its
// confirmation dialog (MET-A-007).
export function ScenarioSuggestions({
  token,
  names,
  onSelect,
  onNoCandidate,
  disabled,
}: {
  token: string;
  names: ReadonlyMap<string, string>;
  onSelect: (scenarioId: string) => void;
  // The full list must be visible, so the caller clears its search.
  onNoCandidate: () => void;
  disabled: boolean;
}) {
  const [description, setDescription] = useState("");
  const [empty, setEmpty] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function submit() {
    abortRef.current?.abort();
    if (description.trim() === "") {
      setEmpty(true);
      setState({ status: "idle" });
      return;
    }
    setEmpty(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    try {
      const result = await fetchSuggestions(
        token,
        description.trim(),
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result.status === "NO_CONFIDENT_CANDIDATE") onNoCandidate();
      setState({ status: "done", result });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      setState({ status: "error", message: userMessage(error) });
    }
  }

  return (
    <div className="scenario-suggestions">
      <label>
        <span className="visually-hidden">Beskriv hændelsen</span>
        <textarea
          placeholder="Beskriv hændelsen"
          rows={3}
          maxLength={MAX_LENGTH}
          value={description}
          aria-invalid={empty}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      {empty && <p role="alert">Beskriv hændelsen for at få forslag.</p>}
      <button
        type="button"
        onClick={submit}
        disabled={disabled || state.status === "loading"}
      >
        Foreslå scenarie
      </button>
      {state.status === "loading" && <p role="status">Finder forslag…</p>}
      {state.status === "error" && <p role="alert">{state.message}</p>}
      {state.status === "done" &&
        (state.result.status === "CONFIDENT" ? (
          <ul className="scenario-list" aria-label="Foreslåede scenarier">
            {state.result.candidates.map((c) => (
              <li key={c.scenarioId}>
                <button
                  type="button"
                  className="scenario-option"
                  disabled={disabled}
                  onClick={() => onSelect(c.scenarioId)}
                >
                  {names.get(c.scenarioId) ?? c.scenarioId} (
                  {Math.round(c.score * 100)} %)
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status">Ingen sikker kandidat – vælg fra den fulde liste</p>
        ))}
    </div>
  );
}
