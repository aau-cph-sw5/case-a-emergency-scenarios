// The fields of contracts/v1/scenario-list.schema.json this list uses.
export type ScenarioSummary = {
  scenarioId: string;
  name: string;
};

const REQUEST_TIMEOUT_MS = 10_000;

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
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<ScenarioSummary[]> {
  let response: Response;
  try {
    response = await fetchImpl("/api/v1/scenarios", {
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
    throw new Error(`GET /api/v1/scenarios failed with ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!isScenarioList(data)) {
    throw new Error("the server sent a scenario list in an unexpected format");
  }
  return data;
}
