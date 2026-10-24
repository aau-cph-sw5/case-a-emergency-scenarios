import { REQUEST_TIMEOUT_MS } from "../../shared/http";
import { ApiError } from "./get-json";
import type { Scenario } from "../../shared/types/v1/scenario";

// The fields of contracts/v1/scenario-list.schema.json this list uses.
export type ScenarioSummary = {
  scenarioId: string;
  name: string;
};

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

function isScenario(data: unknown): data is Scenario {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const scenario = data as Partial<Scenario>;

  return (
    typeof scenario.scenarioId === "string" &&
    typeof scenario.name === "string" &&
    typeof scenario.currentVersion === "string" &&
    Array.isArray(scenario.versions) &&
    scenario.versions.every(
      (version) =>
        typeof version.version === "string" &&
        Array.isArray(version.stationRequirements) &&
        version.stationRequirements.every(
          (station) =>
            typeof station.station === "string" &&
            typeof station.placement === "string" &&
            typeof station.minimumStaffing === "number",
        ),
    )
  );
}

export async function fetchScenario(
  token: string,
  scenarioId: string,
  signal: AbortSignal,
): Promise<Scenario> {
  const path = `/api/v1/scenarios/${encodeURIComponent(scenarioId)}`;

  const response = await fetch(path, {
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

  if (!isScenario(data)) {
    throw new Error("The server returned an invalid scenario");
  }

  return data;
}
