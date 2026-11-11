import { postJson } from "./get-json";
import type { ScenarioSuggestionResponse } from "../../shared/types/v1/scenario-suggestion";

export type Suggestions = ScenarioSuggestionResponse;

// Checks contracts/v1/scenario-suggestion.schema.json.
function isSuggestions(data: unknown): data is Suggestions {
  const body = data as { status?: unknown; candidates?: unknown } | null;
  if (body?.status === "NO_CONFIDENT_CANDIDATE") return true;
  return (
    body?.status === "CONFIDENT" &&
    Array.isArray(body.candidates) &&
    body.candidates.length >= 1 &&
    body.candidates.length <= 5 &&
    body.candidates.every(
      (c) =>
        typeof c?.scenarioId === "string" &&
        typeof c.score === "number" &&
        c.score >= 0 &&
        c.score <= 1,
    )
  );
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
