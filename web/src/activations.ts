import { REQUEST_TIMEOUT_MS } from "../../shared/http";
import { ApiError } from "./get-json";
import type { ScenarioState } from "../../shared/types/v1/scenario-state";
import { isScenarioState } from "./scenario-state";

// The full activation from contracts/v1/scenario-state.schema.json, so the
// station list, status bar and steward list can read the deployments too.
function isActivationList(data: unknown): data is ScenarioState[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        isScenarioState(item) &&
        "activationId" in item &&
        typeof item.activationId === "string" &&
        "deployments" in item &&
        Array.isArray(item.deployments),
    )
  );
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
