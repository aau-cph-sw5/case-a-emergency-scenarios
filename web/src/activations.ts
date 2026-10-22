import { REQUEST_TIMEOUT_MS } from "../../shared/http";
import { ApiError } from "./get-json";

// The fields of an activation (contracts/v1/scenario-state.schema.json) that
// the scenario list uses to mark active scenarios.
type ActivationSummary = {
  scenarioId: string;
  status: string;
};

function isActivationList(data: unknown): data is ActivationSummary[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item?.scenarioId === "string" &&
        typeof item?.status === "string",
    )
  );
}

// The ids of the scenarios that are active right now, from
// GET /api/v1/activations?status=ACTIVE (PR #171). Several scenarios can be
// active at once, so this is a set of ids rather than a single scenario.
export async function fetchActiveScenarioIds(
  token: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Set<string>> {
  let response: Response;
  try {
    response = await fetchImpl("/api/v1/activations?status=ACTIVE", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.any([
        signal,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ]),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        `no answer from the server within ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        { cause: error },
      );
    }
    throw error;
  }
  if (!response.ok) {
    throw new ApiError(
      `GET /api/v1/activations failed with ${response.status}`,
      response.status,
    );
  }
  const data: unknown = await response.json();
  if (!isActivationList(data)) {
    throw new Error("the server sent the activations in an unexpected format");
  }
  // The query already asks for ACTIVE, but the status is checked as well so a
  // closed activation is never shown as active.
  return new Set(
    data
      .filter((activation) => activation.status === "ACTIVE")
      .map((activation) => activation.scenarioId),
  );
}
