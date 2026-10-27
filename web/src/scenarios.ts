import { REQUEST_TIMEOUT_MS } from "../../shared/http";
import { ApiError } from "./get-json";
import type { ScenarioList } from "../../shared/types/v1/scenario-list";

// The fields of contracts/v1/scenario-list.schema.json this list uses.
type Scenario = ScenarioList[number];
export type ScenarioSummary = Pick<Scenario, "scenarioId" | "name"> &
  Partial<Pick<Scenario, "covers">>;

function isScenarioList(data: unknown): data is ScenarioSummary[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item?.scenarioId === "string" && typeof item?.name === "string",
    )
  );
}

// vite.config forwards /api to the server
export async function fetchScenarios(
  token: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ScenarioSummary[]> {
  let response: Response;
  try {
    response = await fetchImpl("/api/v1/scenarios", {
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
      `GET /api/v1/scenarios failed with ${response.status}`,
      response.status,
    );
  }
  const data: unknown = await response.json();
  if (!isScenarioList(data)) {
    throw new Error("the server sent a scenario list in an unexpected format");
  }
  return data;
}
