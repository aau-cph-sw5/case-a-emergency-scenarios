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
import { matchedStations, routeLabel } from "./suggestion-reasons";
import { fetchSuggestions, type Suggestions } from "./suggestions";
import {
  CheckIcon,
  ClearIcon,
  InfoIcon,
  TriangleIcon,
} from "./components/Icon";

/*
 * Scenario suggestion box (#357, MET-A-019). Design decisions:
 *
 * - Describe first, search second: the box sits above the full list, so when
 *   no candidate is confident (#357 AC2) "Gå til listen" only moves focus.
 * - A suggestion only selects the scenario. Activation still goes through
 *   "Aktivér valgt scenarie" and its confirmation dialog (MET-A-007, #357 AC1).
 * - Each suggestion is two lines (name and score, then route and matched
 *   stations) so several fit the narrow column and show why they were
 *   suggested. No score bar: it repeated the number in the green that means
 *   "start".
 * - Submit stays enabled on empty text: it shows an inline message and moves
 *   focus to the field. It is disabled only while a request runs.
 * - Loading shows a spinner, a new label and a role=status line at once
 *   (Doherty threshold); the spinner stops under prefers-reduced-motion.
 * - Enter sends, Shift + Enter adds a line (Jakob's law).
 * - Editing the text clears old suggestions, so an answer never shows for
 *   text that has since changed.
 * - Quick picks are real toggles (Hick's law: four choices). Pressed is a
 *   light grey tint with a check, not yellow, which read as an alarm. The
 *   ranking (#355) searches station names and track segments, so the help
 *   text still asks for a station.
 * - Messages are dark text with a red icon, not red text (4.2:1 on the grey
 *   well). The empty-text alert renders only when needed, since role=alert is
 *   announced on insertion.
 * - The clear button has its own column inside the field, so it never covers
 *   the scrollbar.
 * Styling: .scenario-suggestions in OperatorSections.css, colours from Theme.tsx.
 */

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; result: Suggestions };

const MAX_LENGTH = 2000; // contracts/v1/scenario-suggestion.schema.json
const QUICK_PICKS = ["Signalfejl", "Togstop", "Strømsvigt", "Evakuering"];

// The word as a whole word, so Togstop is not found inside "togstoppet".
function wordPattern(word: string, flags: string) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, flags);
}

function hasWord(text: string, word: string) {
  return wordPattern(word, "iu").test(text);
}

// Adds the word, or removes it again when it is already in the text. Removing
// takes out only the word and the ", " or the spaces next to it, so line
// breaks and the rest of the operator's text stay as typed.
function toggleWord(text: string, word: string): string {
  if (hasWord(text, word)) {
    let out = text;
    for (let m = wordPattern(word, "iu").exec(out); m;) {
      const head = out.slice(0, m.index);
      const tail = out.slice(m.index + m[0].length);
      const comma = /,[ \t]*$/.test(head);
      out = comma
        ? head.replace(/,[ \t]*$/, "") + tail
        : head + tail.replace(/^[ \t]+/, "");
      m = wordPattern(word, "iu").exec(out);
    }
    return out.replace(/[ \t]+$/, "");
  }
  const trimmed = text.trim();
  return trimmed ? `${trimmed}, ${word.toLowerCase()}` : word.toLowerCase();
}

// The server serves this endpoint (#371); a server without it, such as the
// stub server, answers 404.
const unavailable = (error: unknown) =>
  error instanceof ApiError && error.status === 404;

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
  const answerRef = useRef<HTMLDivElement>(null);
  const loading = state.status === "loading";

  useEffect(() => () => abortRef.current?.abort(), []);

  // The answer can land below the fold, so bring it into view when it arrives.
  useEffect(() => {
    if (state.status === "done" || state.status === "error") {
      answerRef.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, [state.status]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (loading) return;
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
      console.error(error);
      setState({
        status: "error",
        message: `${unavailable(error) ? "Forslag er ikke tilgængelige endnu." : userMessage(error)} Prøv igen, eller vælg selv i listen nedenfor.`,
      });
    }
  }

  function edit(text: string) {
    abortRef.current?.abort();
    setDescription(text);
    setEmpty(false);
    setState({ status: "idle" });
  }

  const candidates =
    state.status === "done" && state.result.status === "CONFIDENT"
      ? state.result.candidates
      : [];

  return (
    <form className="scenario-suggestions" onSubmit={submit} noValidate>
      <label htmlFor={fieldId} className="suggest-label">
        Beskriv hændelsen
      </label>
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
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {description !== "" && !loading && (
          <button
            type="button"
            className="suggest-clear"
            aria-label="Ryd beskrivelse og forslag"
            title="Ryd"
            onClick={() => {
              edit("");
              fieldRef.current?.focus();
            }}
          >
            <span aria-hidden="true">
              <ClearIcon />
            </span>
          </button>
        )}
      </div>
      {empty && (
        <p id={errorId} role="alert" className="suggest-error">
          <TriangleIcon />
          Skriv en kort beskrivelse af hændelsen først.
        </p>
      )}
      <p id={helpId} className="suggest-help">
        Nævn gerne station eller strækning. Enter for forslag.
      </p>

      <QuickPicks
        description={description}
        disabled={loading}
        onChange={edit}
      />

      <button
        type="submit"
        className="suggest-submit"
        disabled={disabled || loading}
      >
        {loading && <span className="suggest-spinner" aria-hidden="true" />}
        {loading ? "Finder forslag…" : "Foreslå scenarie"}
      </button>
      <p aria-live="polite" className="suggest-status">
        {loading
          ? "Søger efter passende scenarier…"
          : candidates.length > 0
            ? `${candidates.length} forslag fundet.`
            : ""}
      </p>

      <div ref={answerRef} className="suggest-answer">
        {state.status === "error" && (
          <Notice
            tone="error"
            title="Kunne ikke hente forslag"
            onGoToList={onGoToList}
          >
            {state.message}
          </Notice>
        )}

        {candidates.length > 0 && (
          <SuggestionResults
            id={`${id}-results`}
            candidates={candidates}
            scenarios={scenarios}
            // Editing clears the suggestions, so the current text is the
            // description they were made for.
            description={description}
            selectedId={selectedId}
            disabled={disabled}
            onSelect={onSelect}
          />
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
      </div>
    </form>
  );
}

function QuickPicks({
  description,
  disabled,
  onChange,
}: {
  description: string;
  disabled: boolean;
  onChange: (text: string) => void;
}) {
  return (
    <div className="suggest-chips" role="group" aria-label="Hyppige hændelser">
      {QUICK_PICKS.map((word) => {
        const pressed = hasWord(description, word);
        return (
          <button
            key={word}
            type="button"
            className="suggest-chip"
            aria-pressed={pressed}
            disabled={disabled}
            onClick={() => onChange(toggleWord(description, word))}
          >
            {pressed && <CheckIcon />}
            {word}
          </button>
        );
      })}
    </div>
  );
}

type Candidate = Extract<
  Suggestions,
  { status: "CONFIDENT" }
>["candidates"][number];

function SuggestionResults({
  id,
  candidates,
  scenarios,
  description,
  selectedId,
  disabled,
  onSelect,
}: {
  id: string;
  candidates: readonly Candidate[];
  scenarios: readonly ScenarioSummary[];
  description: string;
  selectedId: string | null;
  disabled: boolean;
  onSelect: (scenarioId: string) => void;
}) {
  const byId = new Map(scenarios.map((s) => [s.scenarioId, s]));
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="operator-eyebrow">
        FORSLAG
      </h3>
      <ul className="suggest-results">
        {candidates.map((candidate) => {
          const scenario = byId.get(candidate.scenarioId);
          const matches = matchedStations(description, scenario?.covers);
          return (
            <li key={candidate.scenarioId}>
              <button
                type="button"
                className="scenario-option suggest-result"
                aria-pressed={candidate.scenarioId === selectedId}
                disabled={disabled}
                onClick={() => onSelect(candidate.scenarioId)}
              >
                <span className="suggest-result-head">
                  <strong>{scenario?.name ?? candidate.scenarioId}</strong>
                  <span>{Math.round(candidate.score * 100)} %</span>
                </span>
                <span className="suggest-reason">
                  {routeLabel(scenario?.covers)}
                  {matches.length > 0 && (
                    <>
                      <span className="visually-hidden">. Matcher:</span>
                      {matches.map((name) => (
                        <span key={name} className="suggest-tag">
                          {name}
                        </span>
                      ))}
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
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
      {tone === "error" ? <TriangleIcon /> : <InfoIcon />}
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
