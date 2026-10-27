import { REQUEST_TIMEOUT_MS } from "../../shared/http";
import { ApiError } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";

function isActivationList(data: unknown): data is ScenarioState[] {
  return Array.isArray(data) && data.every(isScenarioState);
}

// vite.config forwards /api to the server
export async function fetchActiveActivations(
  token: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ScenarioState[]> {
  const path = "/api/v1/activations?status=ACTIVE";
  const response = await fetchImpl(path, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
  });
  if (!response.ok) {
    throw new ApiError(
      `GET ${path} failed with ${response.status}`,
      response.status,
    );
  }
  const data: unknown = await response.json();
  if (!isActivationList(data)) {
    throw new Error("the server sent activations in an unexpected format");
  }
  return data;
}

// The ids of the scenarios that are active right now. The scenario list uses
// them to mark active scenarios and to stop the operator from activating one
// twice. Several can be active at once, so this is a set rather than a single
// id. It reuses fetchActiveActivations, so the request and its check of the
// response live in one place.
export async function fetchActiveScenarioIds(
  token: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<Set<string>> {
  const activations = await fetchActiveActivations(token, signal, fetchImpl);
  return new Set(
    activations
      .filter((activation) => activation.status === "ACTIVE")
      .map((activation) => activation.scenarioId),
  );
}
