import { postJson } from "./get-json";
import type { ScenarioSuggestionResponse } from "../../shared/types/v1/scenario-suggestion";

export type Suggestions = ScenarioSuggestionResponse;

type Candidate = { scenarioId?: unknown; score?: unknown } | null;

function isCandidate(c: Candidate): boolean {
  return (
    typeof c?.scenarioId === "string" &&
    typeof c.score === "number" &&
    c.score >= 0 &&
    c.score <= 1
  );
}

function isConfident(body: { status?: unknown; candidates?: unknown }) {
  const { candidates } = body;
  return (
    body.status === "CONFIDENT" &&
    Array.isArray(candidates) &&
    candidates.length >= 1 &&
    candidates.length <= 5 &&
    candidates.every(isCandidate)
  );
}

// Checks contracts/v1/scenario-suggestion.schema.json.
function isSuggestions(data: unknown): data is Suggestions {
  const body = data as { status?: unknown; candidates?: unknown } | null;
  if (body?.status === "NO_CONFIDENT_CANDIDATE") return true;
  return body !== null && isConfident(body);
}

// Only suggests. Activating still goes through the confirmation dialog.
export function fetchSuggestions(
  token: string,
  description: string,
  signal?: AbortSignal,
): Promise<Suggestions> {
  return postJson(
    "/api/v1/scenario-suggestions",
    token,
    isSuggestions,
    { description },
    signal,
  );
}
