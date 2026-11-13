import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { ApiError, userMessage } from "./get-json";
import type { ScenarioSummary } from "./scenarios";
import { exampleSuggestions } from "./example-suggestions";
import { describeCovers, matchedStations } from "./suggestion-reasons";
import { fetchSuggestions, type Suggestions } from "./suggestions";

/*
 * Scenario suggestion box (#357, MET-A-019). Design decisions:
 *
 * - Describe first, search second: the box sits above the full list, so when
 *   no candidate is confident (#357 AC2) the full list is directly below and
 *   "Gå til listen" only has to move focus there.
 * - A suggestion only selects the scenario. Activation still goes through
 *   "Aktivér valgt scenarie" and its confirmation dialog (MET-A-007, #357 AC1).
 * - Every suggestion shows its score as a number and a bar, and why it was
 *   suggested: the stretch it covers and the stations from the description it
 *   matches. Confidence is never colour alone, and a weak match is visible.
 * - The submit button stays enabled when the text is empty: pressing it shows
 *   an inline message and moves focus to the field, rather than a greyed-out
 *   button that does not say why. It is disabled only while a request runs,
 *   so it cannot be sent twice.
 * - Loading shows a spinner, a new label and a role=status line straight away
 *   (Doherty threshold); the spinner stops under prefers-reduced-motion.
 * - Enter sends, like a search field, since descriptions are short; Shift +
 *   Enter still adds a line. Keeps hands on the keyboard (Jakob's law).
 * - Editing the text clears the old suggestions, so an answer is never shown
 *   for text that has since changed.
 * - Quick-pick buttons for common incidents (Hick's law: four choices;
 *   frequency of use: one click instead of typing). They are real toggles:
 *   pressing again removes the word. Pressed is a light grey tint with a
 *   check that scales in, not yellow, which read as an alarm. The ranking
 *   (#355) searches station names and track segments, so the help text still
 *   asks for a station; the incident word mainly helps the operator log it.
 * Styling: .scenario-suggestions in OperatorSections.css, colours from Theme.tsx.
 */

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  // example: made in the browser because the endpoint is missing (#371).
  | { status: "done"; result: Suggestions; example?: boolean };

const MAX_LENGTH = 2000; // contracts/v1/scenario-suggestion.schema.json
const QUICK_PICKS = ["Signalfejl", "Togstop", "Strømsvigt", "Evakuering"];

// Adds the word, or removes it again when it is already in the text.
function toggleWord(text: string, word: string): string {
  const pattern = new RegExp(word, "gi");
  if (pattern.test(text)) {
    return text
      .replace(pattern, "")
      .replace(/\s*,(\s*,)+/g, ",")
      .replace(/^[\s,]+|[\s,]+$/g, "");
  }
  const trimmed = text.trim();
  return trimmed ? `${trimmed}, ${word.toLowerCase()}` : word.toLowerCase();
}

export function ScenarioSuggestions({
  token,
  scenarios,
  selectedId,
  onSelect,
  onNoCandidate,
  onGoToList,
  disabled,
}: {
  token: string;
  scenarios: readonly ScenarioSummary[];
  selectedId: string | null;
  onSelect: (scenarioId: string) => void;
  // The full list must be visible, so the caller clears its search.
  onNoCandidate: () => void;
  // Moves focus to the full list's search field.
  onGoToList: () => void;
  disabled: boolean;
}) {
  const id = useId();
  const fieldId = `${id}-description`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const [description, setDescription] = useState("");
  const [empty, setEmpty] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const loading = state.status === "loading";
  const byId = new Map(scenarios.map((s) => [s.scenarioId, s]));

  useEffect(() => () => abortRef.current?.abort(), []);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (loading) return;
    abortRef.current?.abort();
    const text = description.trim();
    if (text === "") {
      setEmpty(true);
      setState({ status: "idle" });
      fieldRef.current?.focus();
      return;
    }
    setEmpty(false);
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });
    try {
      const result = await fetchSuggestions(token, text, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status === "NO_CONFIDENT_CANDIDATE") onNoCandidate();
      setState({ status: "done", result });
    } catch (error) {
      if (controller.signal.aborted) return;
      // TEMPORARY until #371: a 404 means the API has no suggestion endpoint
      // yet, so show labelled examples instead. Remove this branch, and
      // example-suggestions.tsx, when the endpoint answers.
      if (error instanceof ApiError && error.status === 404) {
        const result = exampleSuggestions(text, scenarios);
        if (result.status === "NO_CONFIDENT_CANDIDATE") onNoCandidate();
        setState({ status: "done", result, example: true });
        return;
      }
      console.error(error);
      setState({
        status: "error",
        message: `${userMessage(error)} Prøv igen, eller vælg selv i listen nedenfor.`,
      });
    }
  }

  function edit(text: string) {
    abortRef.current?.abort();
    setDescription(text);
    setEmpty(false);
    setState({ status: "idle" });
  }

  function clear() {
    edit("");
    fieldRef.current?.focus();
  }

  const candidates =
    state.status === "done" && state.result.status === "CONFIDENT"
      ? state.result.candidates
      : [];

  return (
    <form
      ref={formRef}
      className="scenario-suggestions"
      onSubmit={submit}
      noValidate
    >
      <label htmlFor={fieldId} className="suggest-label">
        Beskriv hændelsen
      </label>
      {/* The clear button has its own column, so it never covers the scrollbar. */}
      <div className="suggest-field">
        <textarea
          ref={fieldRef}
          id={fieldId}
          rows={3}
          maxLength={MAX_LENGTH}
          placeholder="F.eks. signalfejl ved Forum"
          value={description}
          aria-invalid={empty}
          aria-describedby={`${errorId} ${helpId}`}
          onChange={(event) => edit(event.target.value)}
          onKeyDown={(event) => {
            // isComposing: Enter that confirms an accented letter is not a send.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        {description !== "" && !loading && (
          // 28px circle inside a 36px target (WCAG 2.5.8 asks for 24px).
          <button
            type="button"
            className="suggest-clear"
            aria-label="Ryd beskrivelse og forslag"
            title="Ryd"
            onClick={clear}
          >
            <span aria-hidden="true">
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </span>
          </button>
        )}
      </div>
      {/* Dark text with a red icon: red text on the grey well is only 4.2:1.
          The field's red edge (aria-invalid) points to where to fix it. */}
      {/* Rendered only when needed: role=alert is announced on insertion,
          and an empty alert would be the first alert the page finds. */}
      {empty && (
        <p id={errorId} role="alert" className="suggest-error">
          <WarningIcon />
          Skriv en kort beskrivelse af hændelsen først.
        </p>
      )}
      <p id={helpId} className="suggest-help">
        Nævn gerne station eller strækning. Enter for forslag.
      </p>

      <div
        className="suggest-chips"
        role="group"
        aria-label="Hyppige hændelser"
      >
        {QUICK_PICKS.map((word) => {
          const pressed = description
            .toLowerCase()
            .includes(word.toLowerCase());
          return (
            <button
              key={word}
              type="button"
              className="suggest-chip"
              aria-pressed={pressed}
              disabled={loading}
              onClick={() => edit(toggleWord(description, word))}
            >
              {pressed && (
                <svg
                  className="suggest-chip-check"
                  aria-hidden="true"
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2.5 6.2l2.3 2.3 4.7-5" />
                </svg>
              )}
              {word}
            </button>
          );
        })}
      </div>

      <button
        type="submit"
        className="suggest-submit"
        disabled={disabled || loading}
      >
        {loading && <span className="suggest-spinner" aria-hidden="true" />}
        {loading ? "Finder forslag…" : "Foreslå scenarie"}
      </button>
      {/* aria-live, not role=status: the column's own status messages
          (loading a scenario) keep the status role to themselves. */}
      <p aria-live="polite" className="suggest-status">
        {loading
          ? "Søger efter passende scenarier…"
          : candidates.length > 0
            ? `${candidates.length} forslag fundet. Vælg ét for at se det på kortet.`
            : ""}
      </p>

      {state.status === "error" && (
        <Notice
          tone="error"
          title="Kunne ikke hente forslag"
          onGoToList={onGoToList}
        >
          {state.message}
        </Notice>
      )}

      {state.status === "done" && state.example && (
        // TEMPORARY until #371: says plainly that these are not real results.
        <p className="suggest-example" role="note">
          <strong>Eksempel</strong> Forslagstjenesten er ikke koblet på endnu.
          Forslagene nedenfor er lavet i browseren ud fra stationsnavne.
        </p>
      )}

      {candidates.length > 0 && (
        <section aria-labelledby={`${id}-results`}>
          <h3 id={`${id}-results`} className="operator-eyebrow">
            FORSLAG · BEDSTE MATCH FØRST
          </h3>
          <ul className="suggest-results">
            {candidates.map((candidate) => {
              const scenario = byId.get(candidate.scenarioId);
              const percent = Math.round(candidate.score * 100);
              // Editing clears the suggestions, so the current text is the
              // description they were made for.
              const matches = matchedStations(description, scenario?.covers);
              const stretches = describeCovers(scenario?.covers);
              const isSelected = candidate.scenarioId === selectedId;
              return (
                <li key={candidate.scenarioId}>
                  <button
                    type="button"
                    className="scenario-option suggest-result"
                    aria-pressed={isSelected}
                    disabled={disabled}
                    onClick={() => onSelect(candidate.scenarioId)}
                  >
                    <span className="suggest-result-head">
                      <strong>{scenario?.name ?? candidate.scenarioId}</strong>
                      <span>{percent} %</span>
                    </span>
                    <span className="suggest-bar" aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </span>
                    {stretches.length > 0 && (
                      <span className="suggest-reason">
                        Dækker {stretches.slice(0, 2).join(", ")}
                        {stretches.length > 2 &&
                          ` og ${stretches.length - 2} flere`}
                      </span>
                    )}
                    <span className="suggest-reason">
                      {matches.length > 0 ? (
                        <>
                          Matcher:{" "}
                          {matches.map((name) => (
                            <span key={name} className="suggest-tag">
                              {name}
                            </span>
                          ))}
                        </>
                      ) : (
                        "Ingen stationer fra beskrivelsen."
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {state.status === "done" &&
        state.result.status === "NO_CONFIDENT_CANDIDATE" && (
          <Notice
            tone="info"
            title="Ingen sikre forslag"
            onGoToList={onGoToList}
          >
            Tilføj en station og prøv igen, eller vælg selv i listen nedenfor.
          </Notice>
        )}
    </form>
  );
}

function WarningIcon() {
  return (
    <svg
      className="suggest-icon"
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2.5 18.5 17h-17z" />
      <path d="M10 8v4M10 14.5h.01" />
    </svg>
  );
}

// A message box instead of bare red text: white ground, dark text, a bold
// title, and the tone carried by the icon and edge (red for an error, grey
// for information), so it reads at a glance and never by colour alone. Both
// tones offer the way forward: the full list below.
function Notice({
  tone,
  title,
  children,
  onGoToList,
}: {
  tone: "info" | "error";
  title: string;
  children: ReactNode;
  onGoToList: () => void;
}) {
  return (
    <div
      className={`suggest-notice suggest-notice--${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "error" ? (
        <WarningIcon />
      ) : (
        <svg
          className="suggest-icon"
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="10" cy="10" r="8" />
          <path d="M10 6v5M10 14h.01" />
        </svg>
      )}
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
        <button type="button" className="suggest-goto" onClick={onGoToList}>
          Gå til listen
        </button>
      </div>
    </div>
  );
}
